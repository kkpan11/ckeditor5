/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module image/pictureediting
 */

import { Plugin } from 'ckeditor5/src/core.js';

import { ImageEditing } from './image/imageediting.js';
import { ImageUtils } from './imageutils.js';
import { downcastSourcesAttribute, upcastPicture } from './image/converters.js';
import type { ImageUploadEditing, ImageUploadCompleteEvent } from './imageupload/imageuploadediting.js';

/**
 * This plugin enables the [`<picture>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture) element support in the editor.
 *
 * * It enables the `sources` model attribute on `imageBlock` and `imageInline` model elements
 * (brought by {@link module:image/imageblock~ImageBlock} and {@link module:image/imageinline~ImageInline}, respectively).
 * * It translates the `sources` model element to the view (also: data) structure that may look as follows:
 *
 * ```html
 * <p>Inline image using picture:
 * 	<picture>
 * 		<source media="(min-width: 800px)" srcset="image-large.webp" type="image/webp">
 * 		<source media="(max-width: 800px)" srcset="image-small.webp" type="image/webp">
 * 		<!-- Other sources as specified in the "sources" model attribute... -->
 * 		<img src="image.png" alt="An image using picture" />
 * 	</picture>
 * </p>
 *
 * <p>Block image using picture:</p>
 * <figure class="image">
 * 	<picture>
 * 		<source media="(min-width: 800px)" srcset="image-large.webp" type="image/webp">
 * 		<source media="(max-width: 800px)" srcset="image-small.webp" type="image/webp">
 * 		<!-- Other sources as specified in the "sources" model attribute... -->
 * 		<img src="image.png" alt="An image using picture" />
 * 	</picture>
 * 	<figcaption>Caption of the image</figcaption>
 * </figure>
 * ```
 *
 * **Note:** The value of the `sources` {@glink framework/architecture/editing-engine#changing-the-model model attribute}
 * in both examples equals:
 *
 * ```css
 * [
 * 	{
 * 		media: '(min-width: 800px)',
 * 		srcset: 'image-large.webp',
 * 		type: 'image/webp'
 * 	},
 * 	{
 * 		media: '(max-width: 800px)',
 * 		srcset: 'image-small.webp',
 * 		type: 'image/webp'
 * 	}
 * ]
 * ```
 *
 * * It integrates with the {@link module:image/imageupload~ImageUpload} plugin so images uploaded in the editor
 * automatically render using `<picture>` if the {@glink features/images/image-upload/image-upload upload adapter}
 * supports image sources and provides neccessary data.
 *
 * @private
 */
export class PictureEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	public static get requires() {
		return [ ImageEditing, ImageUtils ] as const;
	}

	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'PictureEditing' as const;
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
	public afterInit(): void {
		const editor = this.editor;

		if ( editor.plugins.has( 'ImageBlockEditing' ) ) {
			editor.model.schema.extend( 'imageBlock', {
				allowAttributes: [ 'sources' ]
			} );
		}

		if ( editor.plugins.has( 'ImageInlineEditing' ) ) {
			editor.model.schema.extend( 'imageInline', {
				allowAttributes: [ 'sources' ]
			} );
		}

		this._setupConversion();
		this._setupImageUploadEditingIntegration();
	}

	/**
	 * Configures conversion pipelines to support upcasting and downcasting images using the `<picture>` view element
	 * and the model `sources` attribute.
	 */
	private _setupConversion(): void {
		const editor = this.editor;
		const conversion = editor.conversion;
		const imageUtils: ImageUtils = editor.plugins.get( 'ImageUtils' );

		conversion.for( 'upcast' ).add( upcastPicture( imageUtils ) );
		conversion.for( 'downcast' ).add( downcastSourcesAttribute( imageUtils ) );
	}

	/**
	 * Makes it possible for uploaded images to get the `sources` model attribute and the `<picture>...</picture>`
	 * view structure out-of-the-box if relevant data is provided along the
	 * {@link module:image/imageupload/imageuploadediting~ImageUploadEditing#event:uploadComplete} event.
	 */
	private _setupImageUploadEditingIntegration(): void {
		const editor = this.editor;

		if ( !editor.plugins.has( 'ImageUploadEditing' ) ) {
			return;
		}

		const imageUploadEditing: ImageUploadEditing = editor.plugins.get( 'ImageUploadEditing' );

		this.listenTo<ImageUploadCompleteEvent>(
			imageUploadEditing,
			'uploadComplete',
			( evt, { imageElement, data } ) => {
				const sources = data.sources;

				if ( !sources ) {
					return;
				}

				editor.model.change( writer => {
					writer.setAttributes( {
						sources
					}, imageElement );
				} );
			} );
	}
}
