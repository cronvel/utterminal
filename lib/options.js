/*
	Utterminal

	Copyright (c) 2018 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const termkit = require( 'terminal-kit' ) ;
const doormen = require( 'doormen' ) ;
const string = require( 'string-kit' ) ;
const tree = require( 'tree-kit' ) ;
//const lazy = require( 'lazyness' ) ;

function noop() {}



function Parser() {
	this.listKey = '_' ;	// porperty name of the array where to put non-keyed options
	this.negativePrefix = 'no-' ;	// the prefix for false flags
	this.noUnknown = false ;	// if set, it throws on unknown options

	this.aliasOptions = {} ;
	this.canonicalOptions = {} ;
	this.options = [] ;
	this.lastOption = null ;

	this.packageJson = null ;
	this.usageString = null ;

	this.lastArgs = null ;
}



// Setters
Parser.prototype.package = function( packageJson ) { this.packageJson = packageJson ; } ;
Parser.prototype.list = function( listKey ) { this.listKey = listKey ; } ;
Parser.prototype.negative = function( negativePrefix ) { this.negativePrefix = negativePrefix ; } ;



function Option( names , defaultValue ) {
	if ( ! Array.isArray( names ) ) { names = [ names ] ; }

	this.canonical = names[ 0 ] ;
	this.aliases = names.slice( 1 ) ;
	this.default = defaultValue ;
	this.type = 'guessed' ;
	this.sanitizer = noop ;
	this.mandatory = false ;
	this.description = null ;
}



Parser.prototype.opt =
Parser.prototype.option = function( names , defaultValue ) {
	var option = new Option( names , defaultValue ) ;

	option.aliases.forEach( alias => this.aliasOptions[ alias ] = option ) ;
	this.canonicalOptions[ option.canonical ] = option ;
	this.options.push( option ) ;
	this.lastOption = option ;

	return this ;
} ;



Parser.prototype.setMandatory = function( value = true ) {
	if ( ! this.lastOption ) { throw new Error( ".setMandatory() called before adding an option" ) ; }

	this.lastOption.mandatory = !! value ;
	return this ;
} ;

Object.defineProperty( Parser.prototype , 'mandatory' , {
	get: function() { return this.setMandatory() ; }
} ) ;

Object.defineProperty( Parser.prototype , 'required' , {
	get: function() { return this.setMandatory() ; }
} ) ;



Parser.prototype.setType = function( type ) {
	if ( ! this.lastOption ) { throw new Error( ".setType() called before adding an option" ) ; }

	this.lastOption.type = type ;
	return this ;
} ;

[ 'boolean' , 'string' , 'number' , 'object' , 'array' , 'arrayOfBooleans' , 'arrayOfStrings' , 'arrayOfNumbers' ].forEach( type => {
	Object.defineProperty( Parser.prototype , type , {
		get: function() { return this.setType( type ) ; }
	} ) ;
} ) ;



Parser.prototype.default = function( defaultValue ) {
	if ( ! this.lastOption ) { throw new Error( ".default() called before adding an option" ) ; }

	this.lastOption.default = defaultValue ;
	return this ;
} ;



Parser.prototype.description = function( str ) {
	if ( ! this.lastOption ) { throw new Error( ".description() called before adding an option" ) ; }

	this.lastOption.description = str ;
	return this ;
} ;



Parser.prototype.usage = function( str ) {
	this.usageString = str ;
	return this ;
} ;



Parser.prototype.list = function( str ) {
	this.listKey = str ;
	return this ;
} ;



Parser.prototype.negative = function( str ) {
	this.negativePrefix = str ;
	return this ;
} ;



Parser.prototype.parseOnly = function( raw = process.argv.slice( 2 ) ) {
	var args = {} ,
		part ,
		chars ,
		index , j ,
		indexOfEq ,
		remainder = false ;

	this.lastArgs = args ;

	var setKeyValue = ( key , value ) => {
		if ( this.aliasOptions[ key ] ) {
			key = this.aliasOptions[ key ].canonical ;
		}

		if ( key === this.listKey && ! args[ this.listKey ] ) {
			// If present, it is always an array
			args[ this.listKey ] = [] ;
		}

		tree.path.autoPush( args , key , value ) ;
	} ;

	for ( index = 0 ; index < raw.length ; index ++ ) {
		part = raw[ index ] ;

		if ( remainder || part[ 0 ] !== '-' ) {
			// This is a value
			setKeyValue( this.listKey , part ) ;
			continue ;
		}

		// Anything below start with at least one -

		if ( part[ 1 ] !== '-' ) {
			if ( part.length <= 1 ) {
				// This is a single "-", it has currently no meaning, we skip it.
				// or should we throw?
				continue ;
			}

			// This is one or many single char options
			chars = string.unicode.toArray( part.slice( 1 ) ) ;

			// The first options are boolean
			for ( j = 0 ; j < chars.length - 1 ; j ++ ) {
				setKeyValue( chars[ j ] , true ) ;
			}

			// The last option can be a boolean or get a value from the next part
			if ( index < raw.length - 1 && raw[ index + 1 ][ 0 ] !== '-' ) {
				setKeyValue( chars[ chars.length - 1 ] , raw[ ++ index ] ) ;
			}
			else {
				setKeyValue( chars[ chars.length - 1 ] , true ) ;
			}

			continue ;
		}

		// Anything below start with two --

		if ( part === '--' ) {
			remainder = true ;
			continue ;
		}

		// Just strip those --
		part = part.slice( 2 ) ;

		if ( part.startsWith( this.negativePrefix ) ) {
			// So this is a boolean, it couldn't be followed by a value
			setKeyValue( part.slice( this.negativePrefix.length ) , false ) ;
			continue ;
		}

		indexOfEq = part.indexOf( '=' ) ;

		if ( indexOfEq !== -1 ) {
			// So this is an option of the type --option=something
			setKeyValue( part.slice( 0 , indexOfEq ) , part.slice( indexOfEq + 1 ) ) ;
			continue ;
		}

		// Finally, try to get a value on the next part, or it is a boolean
		if ( index < raw.length - 1 && raw[ index + 1 ][ 0 ] !== '-' ) {
			setKeyValue( part , raw[ ++ index ] ) ;
		}
		else {
			setKeyValue( part , true ) ;
		}
	}

	return args ;
} ;



Parser.prototype.parse = function( raw ) {
	return this.postProcess( this.parseOnly( raw ) ) ;
} ;



Parser.prototype.postProcess = function( args = this.lastArgs ) {
	Object.keys( args ).forEach( key => {
		var error , option , value ;

		// We don't touch list
		if ( key === this.listKey ) { return ; }

		option = this.canonicalOptions[ key ] ;

		// Check if the option is known
		if ( ! option ) {
			if ( this.noUnknown ) {
				error = new Error( "Unknown option '" + key + "'" ) ;
				error.code = 'unknownOption' ;
				throw error ;
			}

			// Cast to 'guessed'
			args[ key ] = this.cast( key , args[ key ] , 'guessed' ) ;
			return ;
		}

		args[ key ] = this.cast( key , args[ key ] , option.type ) ;
	} ) ;

	return args ;
} ;



Parser.prototype.cast = function( key , value , type , ofType ) {
	var error , casted ;


	switch ( type ) {
		case 'array' :
			ofType = 'guessed' ;
			break ;
		case 'arrayOfBooleans' :
			type = 'array' ;
			ofType = 'boolean' ;
			break ;
		case 'arrayOfStrings' :
			type = 'array' ;
			ofType = 'string' ;
			break ;
		case 'arrayOfNumbers' :
			type = 'array' ;
			ofType = 'number' ;
			break ;
	}

	switch ( type ) {
		case 'guessed' :
			// It accepts everything, but convert to number when possible
			if ( Array.isArray( value ) ) {
				return value.map( e => this.cast( key , e , 'guessed' ) ) ;
			}

			if ( value === true || value === false ) { return value ; }

			casted = + value ;
			if ( ! Number.isNaN( casted ) ) { return casted ; }

			return value ;

		case 'boolean' :
			if ( value === true || value === false ) { return value ; }
			if ( value === 'true' || value === 'on' || value === 'yes' || value === '1' ) { return true ; }
			if ( value === 'false' || value === 'off' || value === 'no' || value === '0' ) { return false ; }

			error = new Error( "Bad type for option '" + key + "', expecting a boolean but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			throw error ;

		case 'string' :
			if ( typeof value === 'string' ) { return value ; }

			error = new Error( "Bad type for option '" + key + "', expecting a string but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			throw error ;

		case 'number' :
			if ( value !== true && value !== false ) {
				casted = + value ;
				if ( ! Number.isNaN( casted ) ) { return casted ; }
			}

			error = new Error( "Bad type for option '" + key + "', expecting a number but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			throw error ;

		case 'object' :
			if ( value && typeof value === 'object' && ! Array.isArray( value ) ) { return value ; }

			error = new Error( "Bad type for option '" + key + "', expecting an object but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			throw error ;

		case 'array' :
			if ( Array.isArray( value ) ) { casted = value ; }
			else if ( ! value || typeof value !== 'object' ) { casted = [ value ] ; }

			if ( Array.isArray( casted ) ) {
				return casted.map( e => this.cast( key , e , ofType ) ) ;
			}

			error = new Error( "Bad type for option '" + key + "', expecting an array but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			throw error ;
	}
} ;



// Create a default parser, add Parser to prototype, so it is possible to instanciate our own Parser
Parser.prototype.Parser = Parser ;
module.exports = new Parser() ;

