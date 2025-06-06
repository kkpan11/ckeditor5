/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { Widget } from '../../src/widget.js';
import { toWidget } from '../../src/utils.js';
import { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic/src/classiceditor.js';
import { ArticlePluginSet } from '@ckeditor/ckeditor5-core/tests/_utils/articlepluginset.js';

function MyPlugin( editor ) {
	editor.model.schema.register( 'div', {
		allowIn: [ '$root' ],
		isObject: true
	} );

	editor.conversion.for( 'downcast' ).elementToElement( {
		model: 'div',
		view: ( modelElement, { writer } ) => {
			return toWidget( writer.createContainerElement( 'div', {
				class: 'widget'
			} ),
			writer,
			{ hasSelectionHandle: true } );
		}
	} );

	editor.conversion.for( 'upcast' ).elementToElement( {
		model: 'div',
		view: 'div'
	} );
}

const config = {
	plugins: [ ArticlePluginSet, Widget, MyPlugin ],
	toolbar: [
		'heading',
		'|',
		'bold',
		'italic',
		'link',
		'bulletedList',
		'numberedList',
		'blockQuote',
		'insertTable',
		'mediaEmbed',
		'undo',
		'redo'
	],
	image: {
		toolbar: [ 'imageStyle:block', 'imageStyle:wrapText', '|', 'imageTextAlternative' ]
	},
	table: {
		contentToolbar: [
			'tableColumn',
			'tableRow',
			'mergeTableCells'
		]
	}
};

ClassicEditor
	.create( document.querySelector( '#editor-ltr' ), config )
	.then( editor => {
		window.editorLtr = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );

ClassicEditor
	.create( document.querySelector( '#editor-rtl' ), Object.assign( {}, config, {
		language: 'ar'
	} ) )
	.then( editor => {
		window.editorRtl = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
