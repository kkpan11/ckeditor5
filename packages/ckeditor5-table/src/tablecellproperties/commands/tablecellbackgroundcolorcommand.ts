/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module table/tablecellproperties/commands/tablecellbackgroundcolorcommand
 */

import type { Editor } from 'ckeditor5/src/core.js';

import { TableCellPropertyCommand } from './tablecellpropertycommand.js';

/**
 * The table cell background color command.
 *
 * The command is registered by the {@link module:table/tablecellproperties/tablecellpropertiesediting~TableCellPropertiesEditing} as
 * the `'tableCellBackgroundColor'` editor command.
 *
 * To change the background color of selected cells, execute the command:
 *
 * ```ts
 * editor.execute( 'tableCellBackgroundColor', {
 *   value: '#f00'
 * } );
 * ```
 */
export class TableCellBackgroundColorCommand extends TableCellPropertyCommand {
	/**
	 * Creates a new `TableCellBackgroundColorCommand` instance.
	 *
	 * @param editor An editor in which this command will be used.
	 * @param defaultValue The default value of the attribute.
	 */
	constructor( editor: Editor, defaultValue: string ) {
		super( editor, 'tableCellBackgroundColor', defaultValue );
	}
}
