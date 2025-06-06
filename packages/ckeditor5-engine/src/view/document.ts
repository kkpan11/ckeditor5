/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/document
 */

import { DocumentSelection } from './documentselection.js';
import { BubblingEmitterMixin } from './observer/bubblingemittermixin.js';

import { Collection, ObservableMixin } from '@ckeditor/ckeditor5-utils';

import type { StylesProcessor } from './stylesmap.js';
import { type RootEditableElement } from './rooteditableelement.js';
import { type DowncastWriter } from './downcastwriter.js';

// @if CK_DEBUG_ENGINE // const { logDocument } = require( '../dev-utils/utils' );

/**
 * Document class creates an abstract layer over the content editable area, contains a tree of view elements and
 * {@link module:engine/view/documentselection~DocumentSelection view selection} associated with this document.
 */
export class Document extends /* #__PURE__ */ BubblingEmitterMixin( /* #__PURE__ */ ObservableMixin() ) {
	/**
	 * Selection done on this document.
	 */
	public readonly selection: DocumentSelection;

	/**
	 * Roots of the view tree. Collection of the {@link module:engine/view/element~Element view elements}.
	 *
	 * View roots are created as a result of binding between {@link module:engine/view/document~Document#roots} and
	 * {@link module:engine/model/document~Document#roots} and this is handled by
	 * {@link module:engine/controller/editingcontroller~EditingController}, so to create view root we need to create
	 * model root using {@link module:engine/model/document~Document#createRoot}.
	 */
	public readonly roots: Collection<RootEditableElement>;

	/**
	 * The styles processor instance used by this document when normalizing styles.
	 */
	public readonly stylesProcessor: StylesProcessor;

	/**
	 * Defines whether document is in read-only mode.
	 *
	 * When document is read-ony then all roots are read-only as well and caret placed inside this root is hidden.
	 *
	 * @observable
	 */
	declare public isReadOnly: boolean;

	/**
	 * True if document is focused.
	 *
	 * This property is updated by the {@link module:engine/view/observer/focusobserver~FocusObserver}.
	 * If the {@link module:engine/view/observer/focusobserver~FocusObserver} is disabled this property will not change.
	 *
	 * @readonly
	 * @observable
	 */
	declare public isFocused: boolean;

	/**
	 * `true` while the user is making a selection in the document (e.g. holding the mouse button and moving the cursor).
	 * When they stop selecting, the property goes back to `false`.
	 *
	 * This property is updated by the {@link module:engine/view/observer/selectionobserver~SelectionObserver}.
	 *
	 * @readonly
	 * @observable
	 */
	declare public isSelecting: boolean;

	/**
	 * True if composition is in progress inside the document.
	 *
	 * This property is updated by the {@link module:engine/view/observer/compositionobserver~CompositionObserver}.
	 * If the {@link module:engine/view/observer/compositionobserver~CompositionObserver} is disabled this property will not change.
	 *
	 * @readonly
	 * @observable
	 */
	declare public isComposing: boolean;

	/**
	 * Post-fixer callbacks registered to the view document.
	 */
	private readonly _postFixers = new Set<ViewDocumentPostFixer>();

	/**
	 * Creates a Document instance.
	 *
	 * @param stylesProcessor The styles processor instance.
	 */
	constructor( stylesProcessor: StylesProcessor ) {
		super();

		this.selection = new DocumentSelection();
		this.roots = new Collection( { idProperty: 'rootName' } );
		this.stylesProcessor = stylesProcessor;

		this.set( 'isReadOnly', false );
		this.set( 'isFocused', false );
		this.set( 'isSelecting', false );
		this.set( 'isComposing', false );
	}

	/**
	 * Gets a {@link module:engine/view/document~Document#roots view root element} with the specified name. If the name is not
	 * specific "main" root is returned.
	 *
	 * @param name Name of the root.
	 * @returns The view root element with the specified name or null when there is no root of given name.
	 */
	public getRoot( name: string = 'main' ): RootEditableElement | null {
		return this.roots.get( name );
	}

	/**
	 * Allows registering post-fixer callbacks. A post-fixers mechanism allows to update the view tree just before it is rendered
	 * to the DOM.
	 *
	 * Post-fixers are executed right after all changes from the outermost change block were applied but
	 * before the {@link module:engine/view/view~View#event:render render event} is fired. If a post-fixer callback made
	 * a change, it should return `true`. When this happens, all post-fixers are fired again to check if something else should
	 * not be fixed in the new document tree state.
	 *
	 * View post-fixers are useful when you want to apply some fixes whenever the view structure changes. Keep in mind that
	 * changes executed in a view post-fixer should not break model-view mapping.
	 *
	 * The types of changes which should be safe:
	 *
	 * * adding or removing attribute from elements,
	 * * changes inside of {@link module:engine/view/uielement~UIElement UI elements},
	 * * {@link module:engine/controller/editingcontroller~EditingController#reconvertItem marking some of the model elements to be
	 * re-converted}.
	 *
	 * Try to avoid changes which touch view structure:
	 *
	 * * you should not add or remove nor wrap or unwrap any view elements,
	 * * you should not change the editor data model in a view post-fixer.
	 *
	 * As a parameter, a post-fixer callback receives a {@link module:engine/view/downcastwriter~DowncastWriter downcast writer}.
	 *
	 * Typically, a post-fixer will look like this:
	 *
	 * ```ts
	 * editor.editing.view.document.registerPostFixer( writer => {
	 * 	if ( checkSomeCondition() ) {
	 * 		writer.doSomething();
	 *
	 * 		// Let other post-fixers know that something changed.
	 * 		return true;
	 * 	}
	 *
	 * 	return false;
	 * } );
	 * ```
	 *
	 * Note that nothing happens right after you register a post-fixer (e.g. execute such a code in the console).
	 * That is because adding a post-fixer does not execute it.
	 * The post-fixer will be executed as soon as any change in the document needs to cause its rendering.
	 * If you want to re-render the editor's view after registering the post-fixer then you should do it manually by calling
	 * {@link module:engine/view/view~View#forceRender `view.forceRender()`}.
	 *
	 * If you need to register a callback which is executed when DOM elements are already updated,
	 * use {@link module:engine/view/view~View#event:render render event}.
	 */
	public registerPostFixer( postFixer: ViewDocumentPostFixer ): void {
		this._postFixers.add( postFixer );
	}

	/**
	 * Destroys this instance. Makes sure that all observers are destroyed and listeners removed.
	 */
	public destroy(): void {
		this.roots.forEach( root => root.destroy() );
		this.stopListening();
	}

	/**
	 * Performs post-fixer loops. Executes post-fixer callbacks as long as none of them has done any changes to the model.
	 *
	 * @internal
	 */
	public _callPostFixers( writer: DowncastWriter ): void {
		let wasFixed = false;

		do {
			for ( const callback of this._postFixers ) {
				wasFixed = callback( writer );

				if ( wasFixed ) {
					break;
				}
			}
		} while ( wasFixed );
	}

	// @if CK_DEBUG_ENGINE // public log( version: any ): void {
	// @if CK_DEBUG_ENGINE // 	logDocument( this, version );
	// @if CK_DEBUG_ENGINE // }
}

export {
	Document as ViewDocument
};

/**
 * Document PostFixer.
 *
 * @see module:engine/view/document~Document#registerPostFixer
 */
export type ViewDocumentPostFixer = ( writer: DowncastWriter ) => boolean;

/**
 * Enum representing type of the change.
 *
 * Possible values:
 *
 * * `children` - for child list changes,
 * * `attributes` - for element attributes changes,
 * * `text` - for text nodes changes.
 */
export type ChangeType = 'children' | 'attributes' | 'text';

/**
 * Event fired whenever document content layout changes. It is fired whenever content is
 * {@link module:engine/view/view~View#event:render rendered}, but should be also fired by observers in case of
 * other actions which may change layout, for instance when image loads.
 *
 * @eventName ~Document#layoutChanged
 */
export type ViewDocumentLayoutChangedEvent = {
	name: 'layoutChanged';
	args: [];
};
