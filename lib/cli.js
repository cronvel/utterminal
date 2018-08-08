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
//const doormen = require( 'doormen' ) ;
const string = require( 'string-kit' ) ;
const tree = require( 'tree-kit' ) ;
const path = require( 'path' ) ;
//const lazy = require( 'lazyness' ) ;

function noop() {}



function Cli( names ) {
	this.listKeyName = '_' ;	// property name of the array where to put non-key'd options, if any
	this.commandKeyName = 'command' ;	// property name of the command, if any
	this.commandOptionsKeyName = 'commandOptions' ;	// when commandSplit is on, this is property name of the command option sub-tree, if any
	this.negativePrefix = 'no-' ;	// the prefix for false flags
	this.strictMode = false ;	// if set, it throws on unknown options
	this.inheritOptions = false ;	// if set, sub-CLI inherit all options of the master-CLI

	// Options
	this.aliasOptions = {} ;
	this.canonicalOptions = {} ;
	this.argOptions = [] ;	// option without flag, still converted in the K/V
	this.options = [] ;
	this.lastOption = null ;

	// Sub-CLI
	this.canonical = null ;	// for sub-CLI, this is the command name
	this.aliases = null ;	// for sub-CLI, this is the command aliases
	this.aliasCommands = {} ;	// child command/sub-CLI
	this.canonicalCommands = {} ;	// child command/sub-CLI
	this.commands = [] ;
	this.commandSplit = false ;	// if true, command options are put in a subtree
	this.activeCli = this ;	// active sub-CLI

	if ( names ) {
		if ( ! Array.isArray( names ) ) { names = [ names ] ; }
		this.canonical = names[ 0 ] ;
		this.aliases = names.slice( 1 ) ;
	}


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

	this.lastParsedArgs = null ;
}



// App
Cli.prototype.package = function( packageJson ) { this.packageJson = packageJson ; return this ; } ;
Cli.prototype.app = function( appName ) { this.appName = appName ; return this ; } ;
Cli.prototype.author = function( appAuthor ) { this.appAuthor = appAuthor ; return this ; } ;
Cli.prototype.version = function( appVersion ) { this.appVersion = appVersion ; return this ; } ;
Cli.prototype.license = function( appLicense ) { this.appLicense = appLicense ; return this ; } ;
Cli.prototype.date = function( appReleaseDate ) { this.appReleaseDate = appReleaseDate ; return this ; } ;
Cli.prototype.exe = function( appExe ) { this.appExe = appExe ; return this ; } ;

// Global options
Cli.prototype.listKey = function( listKeyName ) { this.listKeyName = listKeyName ; return this ; } ;
Cli.prototype.commandKey = function( commandKeyName ) { this.commandKeyName = commandKeyName ; return this ; } ;
Cli.prototype.commandOptionsKey = function( commandOptionsKeyName ) { this.commandOptionsKeyName = commandOptionsKeyName ; return this ; } ;
Cli.prototype.negative = function( negativePrefix ) { this.negativePrefix = negativePrefix ; return this ; } ;

Cli.prototype.setStrict = function( value = true ) {
	this.strictMode = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'strict' , {
	get: function() { return this.setStrict() ; }
} ) ;

Cli.prototype.setInherit = function( value = true ) {
	this.inheritOptions = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'inherit' , {
	get: function() { return this.setInherit() ; }
} ) ;

Cli.prototype.setSplit = function( value = true ) {
	this.commandSplit = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'split' , {
	get: function() { return this.setSplit() ; }
} ) ;



// Commands
Cli.prototype.command = function( names ) {
	var subCli = new Cli( names ) ;

	if ( this.inheritOptions ) {
		Object.assign( subCli.aliasOptions , this.aliasOptions ) ;
		Object.assign( subCli.canonicalOptions , this.canonicalOptions ) ;
		subCli.argOptions = this.argOptions.slice() ;
		subCli.options = this.options.slice() ;
	}

	subCli.aliases.forEach( alias => this.aliasCommands[ alias ] = subCli ) ;
	this.canonicalCommands[ subCli.canonical ] = subCli ;
	this.commands.push( subCli ) ;
	this.activeCli = subCli ;

	return this ;
} ;



// Per CLI/Sub-CLI
Cli.prototype.usage = function( str ) { this.activeCli.usageString = str ; return this ; } ;



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

	option.aliases.forEach( alias => this.activeCli.aliasOptions[ alias ] = option ) ;
	this.activeCli.canonicalOptions[ option.canonical ] = option ;
	this.activeCli.options.push( option ) ;
	this.activeCli.lastOption = option ;

	return this ;
} ;



Cli.prototype.arg =
Cli.prototype.argument = function( key , defaultValue ) {
	var option = new Option( key , defaultValue ) ;

	this.activeCli.argOptions.push( option ) ;
	this.activeCli.canonicalOptions[ option.canonical ] = option ;
	this.activeCli.options.push( option ) ;
	this.activeCli.lastOption = option ;

	return this ;
} ;



Cli.prototype.setMandatory = function( value = true ) {
	if ( ! this.activeCli.lastOption ) { throw new Error( ".setMandatory() called before adding an option" ) ; }

	this.activeCli.lastOption.mandatory = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'mandatory' , {
	get: function() { return this.setMandatory() ; }
} ) ;

Object.defineProperty( Cli.prototype , 'required' , {
	get: function() { return this.setMandatory() ; }
} ) ;



Cli.prototype.setType = function( type ) {
	if ( ! this.activeCli.lastOption ) { throw new Error( ".setType() called before adding an option" ) ; }

	this.activeCli.lastOption.type = type ;
	return this ;
} ;

[ 'boolean' , 'string' , 'number' , 'object' , 'array' , 'arrayOfBooleans' , 'arrayOfStrings' , 'arrayOfNumbers' ].forEach( type => {
	Object.defineProperty( Cli.prototype , type , {
		get: function() { return this.setType( type ) ; }
	} ) ;
} ) ;



Cli.prototype.default = function( defaultValue ) {
	if ( ! this.activeCli.lastOption ) { throw new Error( ".default() called before adding an option" ) ; }

	this.activeCli.lastOption.default = defaultValue ;
	return this ;
} ;



// Set either the app description or the option description
Cli.prototype.description = function( str ) {
	if ( ! this.activeCli.lastOption ) {
		this.activeCli.appDescription = str ;
		return this ;
	}

	this.activeCli.lastOption.description = str ;
	return this ;
} ;





/* Now the real thing */



Cli.prototype.parseOnly = function( raw = process.argv.slice( 2 ) , masterCli = this ) {
	var args = {} , part , chars , argOptionsIndex = 0 , index , j , indexOfEq , remainder = false ,
		subCli , subCliArgs , error ;

	if ( this === masterCli ) { this.lastParsedArgs = args ; }

	var setKeyValue = ( key , value , check ) => {
		if ( this.aliasOptions[ key ] ) {
			key = this.aliasOptions[ key ].canonical ;
		}

		if ( key === masterCli.listKeyName && ! args[ masterCli.listKeyName ] ) {
			// If present, it is always an array
			args[ masterCli.listKeyName ] = [] ;
		}

		if ( check && masterCli.strictMode && ! this.canonicalOptions[ key ] ) {
			error = new Error( "Unknown option '" + key + "'" ) ;
			error.code = 'unknownOption' ;
			error.key = key ;
			error.what = value ;
			error.cli = this ;
			error.user = true ;
			throw error ;
		}

		tree.path.autoPush( args , key , value ) ;
	} ;

	for ( index = 0 ; index < raw.length ; index ++ ) {
		part = raw[ index ] ;

		if ( remainder || part[ 0 ] !== '-' ) {
			if ( this.commands.length ) {
				// This is a command: start over inside the subCli
				subCli = this.canonicalCommands[ part ] || this.aliasCommands[ part ] ;

				if ( ! subCli ) {
					// Issue the error now, because we can't parse the string
					error = new Error( "Unknown command '" + part + '"' ) ;
					error.code = 'unknownCommand' ;
					error.what = part ;
					error.cli = this ;
					error.user = true ;
					throw error ;
				}

				args[ masterCli.commandKeyName ] = part ;
				subCliArgs = subCli.parseOnly( raw.slice( index + 1 ) , this ) ;

				if ( masterCli.commandSplit ) {
					args[ masterCli.commandOptionsKeyName ] = subCliArgs ;
				}
				else {
					Object.assign( args , subCliArgs ) ;
				}

				return args ;
			}

			// This is a value
			if ( argOptionsIndex < this.argOptions.length ) {
				setKeyValue( this.argOptions[ argOptionsIndex ].canonical , part ) ;
			}
			else if ( masterCli.strictMode ) {
				error = new Error( "Unknown argument #" + argOptionsIndex + " '" + part + "'" ) ;
				error.code = 'unknownArgument' ;
				error.key = argOptionsIndex ;
				error.what = part ;
				error.cli = this ;
				error.user = true ;
				throw error ;
			}
			else {
				setKeyValue( masterCli.listKeyName , part ) ;
			}

			argOptionsIndex ++  ;

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
				setKeyValue( chars[ j ] , true , true ) ;
			}

			// The last option can be a boolean or get a value from the next part
			if ( index < raw.length - 1 && raw[ index + 1 ][ 0 ] !== '-' ) {
				setKeyValue( chars[ chars.length - 1 ] , raw[ ++ index ] , true ) ;
			}
			else {
				setKeyValue( chars[ chars.length - 1 ] , true , true ) ;
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

		if ( part.startsWith( masterCli.negativePrefix ) ) {
			// So this is a boolean, it couldn't be followed by a value
			setKeyValue( part.slice( masterCli.negativePrefix.length ) , false , true ) ;
			continue ;
		}

		indexOfEq = part.indexOf( '=' ) ;

		if ( indexOfEq !== -1 ) {
			// So this is an option of the type --option=something
			setKeyValue( part.slice( 0 , indexOfEq ) , part.slice( indexOfEq + 1 ) , true ) ;
			continue ;
		}

		// Finally, try to get a value on the next part, or it is a boolean
		if ( index < raw.length - 1 && raw[ index + 1 ][ 0 ] !== '-' ) {
			setKeyValue( part , raw[ ++ index ] , true ) ;
		}
		else {
			setKeyValue( part , true , true ) ;
		}
	}

	return args ;
} ;



Cli.prototype.parse = function( raw ) {
	return this.postProcess( this.parseOnly( raw ) ) ;
} ;



Cli.prototype.postProcess = function( args = this.lastParsedArgs ) {
	var subCli , subArgs , isCommand = false , error , option ;

	if ( args[ this.commandKeyName ] ) {
		isCommand = true ;
		subCli = this.canonicalCommands[ args[ this.commandKeyName ] ] ;
		subArgs = this.commandSplit ? args[ this.commandOptionsKeyName ] : args ;
	}


	// Check each user option
	Object.keys( args ).forEach( key => {
		// We don't touch those keys
		if ( key === this.listKeyName || key === this.commandKeyName || key === this.commandOptionsKeyName ) {
			return ;
		}

		if ( isCommand && ! this.commandSplit ) {
			option = subCli.canonicalOptions[ key ] || this.canonicalOptions[ key ] ;
		}
		else {
			option = this.canonicalOptions[ key ] ;
		}

		if ( ! option ) {
			// If unknown, cast to 'auto'
			args[ key ] = this.cast( key , args[ key ] , 'auto' ) ;
		}
		else {
			args[ key ] = this.cast( key , args[ key ] , option.type ) ;
		}
	} ) ;

	if ( isCommand && this.commandSplit ) {
		// Check each command user option
		Object.keys( subArgs ).forEach( key => {

			// We don't touch this key
			if ( key === this.listKeyName ) { return ; }

			option = subCli.canonicalOptions[ key ] ;

			if ( ! option ) {
				// If unknown, cast to 'auto'
				subArgs[ key ] = subCli.cast( key , subArgs[ key ] , 'auto' ) ;
			}
			else {
				subArgs[ key ] = subCli.cast( key , subArgs[ key ] , option.type ) ;
			}
		} ) ;
	}


	// Check for mandatory option existance
	this.options.forEach( option_ => {
		if ( option_.mandatory && ! ( option_.canonical in args ) ) {
			error = new Error( "Mandatory option '" + option_.canonical + "' missing" ) ;
			error.code = 'missingOption' ;
			error.key = option_.canonical ;
			error.cli = this ;
			error.user = true ;
			throw error ;
		}
	} ) ;

	// Check for command's mandatory option existance
	if ( isCommand ) {
		subCli.options.forEach( option_ => {
			if ( option_.mandatory && ! ( option_.canonical in subArgs ) ) {
				error = new Error( "Mandatory option '" + option_.canonical + "' missing" ) ;
				error.code = 'missingOption' ;
				error.key = option_.canonical ;
				error.cli = subCli ;
				error.user = true ;
				throw error ;
			}
		} ) ;
	}

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
			error.key = key ;
			error.what = value ;
			error.cli = this ;
			error.user = true ;
			throw error ;

		case 'string' :
			if ( typeof value === 'string' ) { return value ; }

			error = new Error( "Bad type for option '" + key + "', expecting a string but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			error.key = key ;
			error.what = value ;
			error.cli = this ;
			error.user = true ;
			throw error ;

		case 'number' :
			if ( value !== true && value !== false ) {
				casted = + value ;
				if ( ! Number.isNaN( casted ) ) { return casted ; }
			}

			error = new Error( "Bad type for option '" + key + "', expecting a number but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			error.key = key ;
			error.what = value ;
			error.cli = this ;
			error.user = true ;
			throw error ;

		case 'object' :
			if ( value && typeof value === 'object' && ! Array.isArray( value ) ) { return value ; }

			error = new Error( "Bad type for option '" + key + "', expecting an object but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			error.key = key ;
			error.what = value ;
			error.cli = this ;
			error.user = true ;
			throw error ;

		case 'array' :
			if ( Array.isArray( value ) ) { casted = value ; }
			else if ( ! value || typeof value !== 'object' ) { casted = [ value ] ; }

			if ( Array.isArray( casted ) ) {
				return casted.map( e => this.cast( key , e , ofType ) ) ;
			}

			error = new Error( "Bad type for option '" + key + "', expecting an array but got '" + value +  "'" ) ;
			error.code = 'badType' ;
			error.key = key ;
			error.what = value ;
			error.cli = this ;
			error.user = true ;
			throw error ;
	}
} ;



Cli.prototype.run = function() {
	var args ;

	this.mergeInfo() ;
	this.displayIntro() ;

	try {
		args = this.parse() ;
	}
	catch ( error ) {
		if ( ! error.user ) { throw error ; }
		this.displayUserError( error ) ;
		this.displayHelp( false ) ;
		term( '\n' ) ;
		return ;
	}


	// --------------- /!\ Should be activated with some option!
	if ( args.help ) {
		this.displayHelp() ;
		term( '\n' ) ;
		return args ;
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
		this.appVersion = this.packageJson.version ;
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



Cli.prototype.displayHelp = function( descriptionEnabled = true ) {
	if ( this.appDescription &&  descriptionEnabled ) {
		term( "%s" , this.appDescription )( '\n\n' ) ;
	}

	if ( this.usageString ) {
		term( this.usageString + '%1D' , this.appExe )( '\n' ) ;
	}
	
	this.displayOptionsHelp() ;
} ;



Cli.prototype.displayOptionsHelp = function( descriptionEnabled = true ) {
	var table , reformattedTable , altOptionsMaxWidth = 0 , descriptionMaxWidth = 0 ,
		leftColumnWidth , rightColumnWidth , leftMargin , rightMargin , leftIndent ;
	
	table = this.options.map( option => {
		var altOptions = [ option.canonical , ... option.aliases ].map( one => one.length > 1 ? '--' + one : '-' + one ).join( ', ' ) ;
		
		var altOptionsWidth = string.unicode.width( altOptions ) ;
		if ( altOptionsWidth > altOptionsMaxWidth ) { altOptionsMaxWidth = altOptionsWidth ; }
		
		var descriptionWidth = string.unicode.width( option.description ) ;
		if ( descriptionWidth > descriptionMaxWidth ) { descriptionMaxWidth = descriptionWidth ; }
		
		return [ altOptions , option.description ] ;
	} ) ;
	
	leftIndent = 4 ;
	leftMargin = 2 ;
	rightMargin = 6 ;
	leftColumnWidth = Math.min( altOptionsMaxWidth + leftIndent , 40 , Math.floor( ( term.width - leftMargin - rightMargin ) / 3 ) ) ;
	rightColumnWidth = Math.min( descriptionMaxWidth , 80 , Math.floor( ( term.width - leftMargin - rightMargin ) * 2 / 3 ) ) ;
	
	reformattedTable = [] ;
	
	table.forEach( line => {
		var [ left , right ] = line ;
		left = string.wordwrap( left , { width: leftColumnWidth - leftIndent , noJoin: true } ) ;
		right = string.wordwrap( right , { width: rightColumnWidth , noJoin: true } ) ;
		
		if ( left.length >= right.length ) {
			left.forEach( ( leftLine , index ) => {
				reformattedTable.push( [
					( index ? ' '.repeat( leftIndent ) : '' ) + leftLine ,
					right[ index ] || ''
				] ) ;
			} ) ;
		}
		else {
			right.forEach( ( rightLine , index ) => {
				reformattedTable.push( [
					( index ? ' '.repeat( leftIndent ) : '' ) + ( left[ index ] || '' ) ,
					rightLine
				] ) ;
			} ) ;
		}
	} ) ;
	
	reformattedTable.forEach( line => {
		var [ left , right ] = line ;

		term.column.cyan( leftMargin , "%s" , left ) ;
		term.column.cyan( leftMargin + leftColumnWidth + rightMargin , "%s" , right ) ;
		term( '\n' ) ;
	} ) ;
} ;



Cli.prototype.displayUserError = function( userError ) {
	term.red( "Command line error: %s." , userError.message )( '\n' ) ;
	term( '\n' ) ;
} ;



// Create a default parser, add Cli to prototype, so it is possible to instanciate our own Cli
Cli.prototype.Cli = Cli ;
module.exports = new Cli() ;

