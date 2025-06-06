/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { global } from 'ckeditor5/src/utils.js';
import { Rect } from '@ckeditor/ckeditor5-utils/src/dom/rect.js';
import { Point } from '@ckeditor/ckeditor5-widget/tests/widgetresize/_utils/utils.js';
import { TableColumnResizeEditing } from '../../../src/tablecolumnresize/tablecolumnresizeediting.js';
import { getTableColumnsWidths } from '../../../src/tablecolumnresize/utils.js';

export const tableColumnResizeMouseSimulator = {
	down( editor, domTarget, options = {} ) {
		const preventDefault = options.preventDefault || sinon.spy().named( 'preventDefault' );
		const stop = options.stop || sinon.spy().named( 'stop' );

		const clientX = getColumnResizerRect( domTarget ).x;

		const eventInfo = { stop };

		const domEventData = {
			target: editor.editing.view.domConverter.domToView( domTarget ),
			domEvent: { clientX, clientY: 0 },
			preventDefault
		};

		const plugin = this._getPlugin( editor );

		plugin._onMouseDownHandler( eventInfo, domEventData );

		// Skip threshold checking as it is not needed for most of the tests.
		if ( options.ignoreThreshold !== false && plugin._initialMouseEventData ) {
			// Let's assume user moved the mouse by 5px.
			plugin._startResizingAfterThreshold();
			plugin._initialMouseEventData = null;
		}
	},

	move( editor, domTarget, vector ) {
		const eventInfo = {};

		const domEventData = {
			clientX: getColumnResizerRect( domTarget ).moveBy( vector.x, vector.y ).x,
			clientY: 0
		};

		this._getPlugin( editor )._onMouseMoveHandler( eventInfo, domEventData );
	},

	up( editor ) {
		this._getPlugin( editor )._onMouseUpHandler();
	},

	over( editor, domTarget, options = {} ) {
		const preventDefault = options.preventDefault || sinon.spy().named( 'preventDefault' );
		const stop = options.stop || sinon.spy().named( 'stop' );

		const clientX = getColumnResizerRect( domTarget ).x;

		const eventInfo = { stop };

		const domEventData = {
			target: editor.editing.view.domConverter.domToView( domTarget ),
			domEvent: { clientX, clientY: 0 },
			preventDefault
		};

		this._getPlugin( editor )._onMouseOverHandler( eventInfo, domEventData );
	},

	out( editor, domTarget, options = {} ) {
		const preventDefault = options.preventDefault || sinon.spy().named( 'preventDefault' );
		const stop = options.stop || sinon.spy().named( 'stop' );

		const clientX = getColumnResizerRect( domTarget ).x;

		const eventInfo = { stop };

		const domEventData = {
			target: editor.editing.view.domConverter.domToView( domTarget ),
			domEvent: { clientX, clientY: 0 },
			preventDefault
		};

		this._getPlugin( editor )._onMouseOutHandler( eventInfo, domEventData );
	},

	resize( editor, domTable, columnIndex, vector, rowIndex, options ) {
		const domResizer = getDomResizer( domTable, columnIndex, rowIndex );

		this.down( editor, domResizer, options || {} );
		this.move( editor, domResizer, vector );
		this.up( editor );
	},

	_getPlugin( editor ) {
		return editor.plugins.get( TableColumnResizeEditing );
	}
};

const getWidth = domElement => parseFloat( global.window.getComputedStyle( domElement ).width );

export const getDomTable = view => view.domConverter.mapViewToDom( view.document.getRoot().getChild( 0 ) );

export const getModelTable = model => model.document.getRoot().getChild( 0 );

export const getViewTable = view => view.document.getRoot().getChild( 0 ).getChild( 1 );

export function getDomTableRects( domTable ) {
	return domTable.getClientRects()[ 0 ];
}

export function getDomTableCellRects( domTable, columnIndex ) {
	return Array.from( domTable.querySelectorAll( 'td' ) )[ columnIndex ].getClientRects()[ 0 ];
}

export function getColumnWidth( domTable, columnIndex ) {
	return getWidth( Array.from( domTable.querySelectorAll( 'col' ) )[ columnIndex ] );
}

export function getViewColumnWidthsPx( domTable ) {
	const widths = [];

	Array.from( domTable.querySelectorAll( 'col' ) ).forEach( col => {
		widths.push( getWidth( col ) );
	} );

	return widths;
}

export function getModelColumnWidthsPc( modelTable ) {
	return getTableColumnsWidths( modelTable ).map( width => width.replace( '%', '' ) );
}

export function getViewColumnWidthsPc( viewTable ) {
	const viewColWidths = [];
	const viewColgroup = [ ...viewTable.getChildren() ].find( viewElement => viewElement.is( 'element', 'colgroup' ) );

	for ( const viewCol of [ ...viewColgroup.getChildren() ] ) {
		viewColWidths.push( viewCol.getStyle( 'width' ).replaceAll( '%', '' ) );
	}

	return viewColWidths;
}

export function getDomResizer( domTable, columnIndex, rowIndex ) {
	const rows = Array.from( domTable.querySelectorAll( 'tr' ) );
	const row = rows[ rowIndex ? rowIndex : 0 ];
	const domResizer = Array.from( row.querySelectorAll( '.ck-table-column-resizer' ) )[ columnIndex ];

	return domResizer;
}

export function getColumnResizerRect( resizerElement ) {
	const cellRect = new Rect( resizerElement.parentElement );
	const resizerPosition = new Point( cellRect.right, cellRect.top + cellRect.height / 2 );

	return resizerPosition;
}

export function getComputedStyle( element, property ) {
	return global.window.getComputedStyle( element )[ property ];
}
