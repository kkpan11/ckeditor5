/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module utils/areconnectedthroughproperties
 */

/**
 * Traverses both structures to find out whether there is a reference that is shared between both structures.
 */
export function areConnectedThroughProperties( obj1: object, obj2: object ): boolean {
	if ( obj1 === obj2 && isObject( obj1 ) ) {
		return true;
	}

	const subNodes1 = getSubNodes( obj1 );
	const subNodes2 = getSubNodes( obj2 );

	for ( const node of subNodes1 ) {
		if ( subNodes2.has( node ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Traverses JS structure and stores all sub-nodes, including the head node.
 * It walks into each iterable structures with the `try catch` block to omit errors that might be thrown during
 * tree walking. All primitives, functions and built-ins are skipped.
 */
function getSubNodes( head: unknown ): Set<unknown> {
	const nodes = [ head ];

	// Nodes are stored to prevent infinite looping.
	const subNodes = new Set();

	while ( nodes.length > 0 ) {
		const node = nodes.shift();

		if ( subNodes.has( node ) || shouldNodeBeSkipped( node ) ) {
			continue;
		}

		subNodes.add( node );

		// Handle arrays, maps, sets, custom collections that implements `[ Symbol.iterator ]()`, etc.
		if ( ( node as Iterable<unknown> )[ Symbol.iterator ] ) {
			// The custom editor iterators might cause some problems if the editor is crashed.
			try {
				nodes.push( ...( node as Iterable<unknown> ) );
			}
			// eslint-disable-next-line no-empty
			catch {}
		} else {
			nodes.push( ...Object.values( node as any ) );
		}
	}

	return subNodes;
}

function shouldNodeBeSkipped( node: unknown ): boolean {
	const type = Object.prototype.toString.call( node );

	return (
		type === '[object Number]' ||
		type === '[object Boolean]' ||
		type === '[object String]' ||
		type === '[object Symbol]' ||
		type === '[object Function]' ||
		type === '[object Date]' ||
		type === '[object RegExp]' ||

		node === undefined ||
		node === null ||

		// Skip native DOM objects, e.g. Window, nodes, events, etc.
		node instanceof EventTarget ||
		node instanceof Event
	);
}

function isObject( structure: unknown ): boolean {
	return typeof structure === 'object' && structure !== null;
}
