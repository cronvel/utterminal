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
const term = termkit.terminal ;
const doormen = require( 'doormen' ) ;
const string = require( 'string-kit' ) ;
const tree = require( 'tree-kit' ) ;
const path = require( 'path' ) ;
//const lazy = require( 'lazyness' ) ;

function noop() {}



function Cli() {
	this.listKey = '_' ;	// porperty name of the array where to put non-keyed options
	this.negativePrefix = 'no-' ;	// the prefix for false flags
	this.noUnknown = false ;	// if set, it throws on unknown options

	this.aliasOptions = {} ;
	this.canonicalOptions = {} ;
	this.options = [] ;
	this.lastOption = null ;

	// App information
	this.packageJson = null ;
	this.appName = null ;
	this.appAuthor = null ;
	this.appVersion = null ;
	this.appLicense = null ;
	this.appDescription = null ;
	this.appReleaseDate = null ;
	this.appExe = null ;
	
	this.usageString = null ;

	this.lastArgs = null ;
}



// Setters
Cli.prototype.package = function( packageJson ) { this.packageJson = packageJson ; return this ; } ;
Cli.prototype.app = function( appName ) { this.appName = appName ; return this ; } ;
Cli.prototype.author = function( appAuthor ) { this.appAuthor = appAuthor ; return this ; } ;
Cli.prototype.version = function( appVersion ) { this.appVersion = appVersion ; return this ; } ;
Cli.prototype.license = function( appLicense ) { this.appLicense = appLicense ; return this ; } ;
Cli.prototype.date = function( appReleaseDate ) { this.appReleaseDate = appReleaseDate ; return this ; } ;
Cli.prototype.exe = function( appExe ) { this.appExe = appExe ; return this ; } ;

Cli.prototype.list = function( listKey ) { this.listKey = listKey ; return this ; } ;
Cli.prototype.negative = function( negativePrefix ) { this.negativePrefix = negativePrefix ; return this ; } ;
Cli.prototype.usage = function( str ) { this.usageString = str ; return this ; } ;
Cli.prototype.list = function( str ) { this.listKey = str ; return this ; } ;
Cli.prototype.negative = function( str ) { this.negativePrefix = str ; return this ; } ;






function Option( names , defaultValue ) {
	if ( ! Array.isArray( names ) ) { names = [ names ] ; }

	this.canonical = names[ 0 ] ;
	this.aliases = names.slice( 1 ) ;
	this.default = defaultValue ;
	this.type = 'auto' ;
	this.sanitizer = noop ;
	this.mandatory = false ;
	this.description = null ;
}



Cli.prototype.opt =
Cli.prototype.option = function( names , defaultValue ) {
	var option = new Option( names , defaultValue ) ;

	option.aliases.forEach( alias => this.aliasOptions[ alias ] = option ) ;
	this.canonicalOptions[ option.canonical ] = option ;
	this.options.push( option ) ;
	this.lastOption = option ;

	return this ;
} ;



Cli.prototype.setMandatory = function( value = true ) {
	if ( ! this.lastOption ) { throw new Error( ".setMandatory() called before adding an option" ) ; }

	this.lastOption.mandatory = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'mandatory' , {
	get: function() { return this.setMandatory() ; }
} ) ;

Object.defineProperty( Cli.prototype , 'required' , {
	get: function() { return this.setMandatory() ; }
} ) ;



Cli.prototype.setType = function( type ) {
	if ( ! this.lastOption ) { throw new Error( ".setType() called before adding an option" ) ; }

	this.lastOption.type = type ;
	return this ;
} ;

[ 'boolean' , 'string' , 'number' , 'object' , 'array' , 'arrayOfBooleans' , 'arrayOfStrings' , 'arrayOfNumbers' ].forEach( type => {
	Object.defineProperty( Cli.prototype , type , {
		get: function() { return this.setType( type ) ; }
	} ) ;
} ) ;



Cli.prototype.default = function( defaultValue ) {
	if ( ! this.lastOption ) { throw new Error( ".default() called before adding an option" ) ; }

	this.lastOption.default = defaultValue ;
	return this ;
} ;



// Set either the app description or the option description
Cli.prototype.description = function( str ) {
	if ( ! this.lastOption ) {
		this.appDescription = str ;
		return this ;
	}

	this.lastOption.description = str ;
	return this ;
} ;



Cli.prototype.parseOnly = function( raw = process.argv.slice( 2 ) ) {
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



Cli.prototype.parse = function( raw ) {
	return this.postProcess( this.parseOnly( raw ) ) ;
} ;



Cli.prototype.postProcess = function( args = this.lastArgs ) {
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

			// Cast to 'auto'
			args[ key ] = this.cast( key , args[ key ] , 'auto' ) ;
			return ;
		}

		args[ key ] = this.cast( key , args[ key ] , option.type ) ;
	} ) ;

	return args ;
} ;



Cli.prototype.cast = function( key , value , type , ofType ) {
	var error , casted ;


	switch ( type ) {
		case 'array' :
			ofType = 'auto' ;
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
		case 'auto' :
			// It accepts everything, but convert to number when possible
			if ( Array.isArray( value ) ) {
				return value.map( e => this.cast( key , e , 'auto' ) ) ;
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



Cli.prototype.run = function() {
	var args ;

	this.mergeInfo() ;
	this.displayIntro() ;

	args = this.parse() ;


	// --------------- /!\ Should be activated with some option!
	if ( args.help ) {
		this.displayHelp() ;
	}

	return args ;
} ;



// Merge information from multiple sources (currently: user-defined and package.json)
Cli.prototype.mergeInfo = function() {
	if ( ! this.packageJson ) { return ; }
	
	if ( ! this.appName && this.packageJson.copyright && this.packageJson.copyright.title ) {
		// Specific to my own packages
		this.appName = this.packageJson.copyright.title ;
	}
	
	if ( ! this.appName && this.packageJson.name ) {
		this.appName = string.toTitleCase( this.packageJson.name ) ;
	}
	
	if ( ! this.appAuthor && this.packageJson.author ) {
		if ( typeof this.packageJson.author === 'string' ) {
			this.appAuthor = this.packageJson.author ;
		}
		else if ( typeof this.packageJson.author.name === 'string' ) {
			this.appAuthor = this.packageJson.author.name ;
		}
	}
	
	if ( ! this.appVersion && this.packageJson.version ) {
		this.appVersion = this.packageJson.version
	}

	if ( ! this.appDescription && this.packageJson.description ) {
		this.appDescription = this.packageJson.description ;
	}
	
	if ( ! this.appLicense && this.packageJson.license ) {
		this.appLicense = this.packageJson.license ;
	}

	if ( ! this.appExe ) {
		this.appExe = path.basename( process.argv[ 1 ] ) ;
	}
} ;



Cli.prototype.displayIntro = function() {
	if ( this.appName ) {
		term.bold.magenta( this.appName ) ;
		
		if ( this.appVersion ) {
			term.dim( ' v%s' , this.appVersion ) ;
		}
		
		if ( this.appAuthor ) {
			term.dim( ' by ^/%s' , this.appAuthor ) ;
		}
		
		term( '\n' ) ;
		
		if ( this.appLicense ) {
			term.dim( 'Licensed under the ^/%s license.' , this.appLicense )( '\n' ) ;
		}
		
		term( '\n' ) ;
	}
} ;



Cli.prototype.displayHelp = function() {
	if ( this.appDescription ) {
		term( "%s" , this.appDescription )( '\n\n' ) ;
	}
	
	if ( this.usageString ) {
		term( this.usageString + '%1D' , this.appExe )( '\n' ) ;
	}
	
} ;



// Create a default parser, add Cli to prototype, so it is possible to instanciate our own Cli
Cli.prototype.Cli = Cli ;
module.exports = new Cli() ;

