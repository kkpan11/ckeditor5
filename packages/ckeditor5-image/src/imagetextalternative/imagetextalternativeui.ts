/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module image/imagetextalternative/imagetextalternativeui
 */

import { Plugin } from 'ckeditor5/src/core.js';
import {
	ButtonView,
	ContextualBalloon,
	clickOutsideHandler,
	CssTransitionDisablerMixin,
	type ViewWithCssTransitionDisabler
} from 'ckeditor5/src/ui.js';
import { IconTextAlternative } from 'ckeditor5/src/icons.js';

import {
	TextAlternativeFormView,
	type TextAlternativeFormViewCancelEvent,
	type TextAlternativeFormViewSubmitEvent
} from './ui/textalternativeformview.js';
import { repositionContextualBalloon, getBalloonPositionData } from '../image/ui/utils.js';
import { type ImageTextAlternativeCommand } from './imagetextalternativecommand.js';
import { type ImageUtils } from '../imageutils.js';

/**
 * The image text alternative UI plugin.
 *
 * The plugin uses the {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon}.
 */
export class ImageTextAlternativeUI extends Plugin {
	/**
	 * The contextual balloon plugin instance.
	 */
	private _balloon?: ContextualBalloon;

	/**
	 * A form containing a textarea and buttons, used to change the `alt` text value.
	 */
	private _form?: TextAlternativeFormView & ViewWithCssTransitionDisabler;

	/**
	 * @inheritDoc
	 */
	public static get requires() {
		return [ ContextualBalloon ] as const;
	}

	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'ImageTextAlternativeUI' as const;
	}

	/**
	 * @inheritDoc
	 */
	public static override get isOfficialPlugin(): true {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public init(): void {
		this._createButton();
	}

	/**
	 * @inheritDoc
	 */
	public override destroy(): void {
		super.destroy();

		// Destroy created UI components as they are not automatically destroyed (see ckeditor5#1341).
		if ( this._form ) {
			this._form.destroy();
		}
	}

	/**
	 * Creates a button showing the balloon panel for changing the image text alternative and
	 * registers it in the editor {@link module:ui/componentfactory~ComponentFactory ComponentFactory}.
	 */
	private _createButton(): void {
		const editor = this.editor;
		const t = editor.t;

		editor.ui.componentFactory.add( 'imageTextAlternative', locale => {
			const command: ImageTextAlternativeCommand = editor.commands.get( 'imageTextAlternative' )!;
			const view = new ButtonView( locale );

			view.set( {
				label: t( 'Change image text alternative' ),
				icon: IconTextAlternative,
				tooltip: true
			} );

			view.bind( 'isEnabled' ).to( command, 'isEnabled' );
			view.bind( 'isOn' ).to( command, 'value', value => !!value );

			this.listenTo( view, 'execute', () => {
				this._showForm();
			} );

			return view;
		} );
	}

	/**
	 * Creates the {@link module:image/imagetextalternative/ui/textalternativeformview~TextAlternativeFormView}
	 * form.
	 */
	private _createForm(): void {
		const editor = this.editor;
		const view = editor.editing.view;
		const viewDocument = view.document;
		const imageUtils: ImageUtils = editor.plugins.get( 'ImageUtils' );

		this._balloon = this.editor.plugins.get( 'ContextualBalloon' );

		this._form = new ( CssTransitionDisablerMixin( TextAlternativeFormView ) )( editor.locale );

		// Render the form so its #element is available for clickOutsideHandler.
		this._form.render();

		this.listenTo<TextAlternativeFormViewSubmitEvent>( this._form, 'submit', () => {
			editor.execute( 'imageTextAlternative', {
				newValue: this._form!.labeledInput.fieldView.element!.value
			} );

			this._hideForm( true );
		} );

		this.listenTo<TextAlternativeFormViewCancelEvent>( this._form, 'cancel', () => {
			this._hideForm( true );
		} );

		// Reposition the balloon or hide the form if an image widget is no longer selected.
		this.listenTo( editor.ui, 'update', () => {
			if ( !imageUtils.getClosestSelectedImageWidget( viewDocument.selection ) ) {
				this._hideForm( true );
			} else if ( this._isVisible ) {
				repositionContextualBalloon( editor );
			}
		} );

		// Close on click outside of balloon panel element.
		clickOutsideHandler( {
			emitter: this._form,
			activator: () => this._isVisible,
			contextElements: () => [ this._balloon!.view.element! ],
			callback: () => this._hideForm()
		} );
	}

	/**
	 * Shows the {@link #_form} in the {@link #_balloon}.
	 */
	private _showForm(): void {
		if ( this._isVisible ) {
			return;
		}

		if ( !this._form ) {
			this._createForm();
		}

		const editor = this.editor;
		const command: ImageTextAlternativeCommand = editor.commands.get( 'imageTextAlternative' )!;
		const labeledInput = this._form!.labeledInput;

		this._form!.disableCssTransitions();

		if ( !this._isInBalloon ) {
			this._balloon!.add( {
				view: this._form!,
				position: getBalloonPositionData( editor )
			} );
		}

		// Make sure that each time the panel shows up, the field remains in sync with the value of
		// the command. If the user typed in the input, then canceled the balloon (`labeledInput#value`
		// stays unaltered) and re-opened it without changing the value of the command, they would see the
		// old value instead of the actual value of the command.
		// https://github.com/ckeditor/ckeditor5-image/issues/114
		labeledInput.fieldView.value = labeledInput.fieldView.element!.value = command.value || '';

		this._form!.labeledInput.fieldView.select();

		this._form!.enableCssTransitions();
	}

	/**
	 * Removes the {@link #_form} from the {@link #_balloon}.
	 *
	 * @param focusEditable Controls whether the editing view is focused afterwards.
	 */
	private _hideForm( focusEditable: boolean = false ): void {
		if ( !this._isInBalloon ) {
			return;
		}

		// Blur the input element before removing it from DOM to prevent issues in some browsers.
		// See https://github.com/ckeditor/ckeditor5/issues/1501.
		if ( this._form!.focusTracker.isFocused ) {
			this._form!.saveButtonView.focus();
		}

		this._balloon!.remove( this._form! );

		if ( focusEditable ) {
			this.editor.editing.view.focus();
		}
	}

	/**
	 * Returns `true` when the {@link #_form} is the visible view in the {@link #_balloon}.
	 */
	private get _isVisible(): boolean {
		return !!this._balloon && this._balloon.visibleView === this._form;
	}

	/**
	 * Returns `true` when the {@link #_form} is in the {@link #_balloon}.
	 */
	private get _isInBalloon(): boolean {
		return !!this._balloon && this._balloon.hasView( this._form! );
	}
}
