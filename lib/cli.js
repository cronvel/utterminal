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
	this.restArgsKeyName = 'rest' ;	// property name of the array where to put non-key'd options, if any
	this.commandKeyName = 'command' ;	// property name of the command, if any
	this.commandOptionsKeyName = 'commandOptions' ;	// when commandSplit is on, this is property name of the command option sub-tree, if any
	this.negativePrefix = 'no-' ;	// the prefix for false flags
	this.strictMode = false ;	// if set, it throws on unknown options
	this.inheritOptions = false ;	// if set, sub-CLI inherit all options of the master-CLI

	// Options
	this.aliasOptions = {} ;
	this.canonicalOptions = {} ;
	this.argOptions = [] ;	// options without flag, still converted in the K/V
	this.restArgsOption = null ;	// options without flag, remainder of named ard, are stacked in an array
	this.flagOptions = [] ;	// K/V option or flag options
	this.options = [] ;	// All options
	this.lastOptionGroup = 'Options' ;
	this.lastOption = null ;

	// Sub-CLI
	this.group = null ;	// the group this sub-CLI belongs to
	this.canonical = null ;	// for sub-CLI, this is the command name
	this.aliases = null ;	// for sub-CLI, this is the command aliases
	this.aliasCommands = {} ;	// child command/sub-CLI
	this.canonicalCommands = {} ;	// child command/sub-CLI
	this.commands = [] ;
	this.lastCommandGroup = 'Commands' ;
	this.commandSplit = false ;	// if true, command options are put in a subtree
	this.execFn = null ;
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
	this.appDetails = null ;
	this.appReleaseDate = null ;
	this.appExe = null ;

	this.usageString = null ;

	// Runtime
	this.playIntro = true ;
	this.parsedArgs = null ;
	this.toExec = null ;
}



// App
Cli.prototype.package = function( packageJson ) { this.packageJson = packageJson ; return this ; } ;
Cli.prototype.app = Cli.prototype.name = function( appName ) { this.appName = appName ; return this ; } ;
Cli.prototype.author = function( appAuthor ) { this.appAuthor = appAuthor ; return this ; } ;
Cli.prototype.version = function( appVersion ) { this.appVersion = appVersion ; return this ; } ;
Cli.prototype.license = function( appLicense ) { this.appLicense = appLicense ; return this ; } ;
Cli.prototype.date = function( appReleaseDate ) { this.appReleaseDate = appReleaseDate ; return this ; } ;
Cli.prototype.exe = function( appExe ) { this.appExe = appExe ; return this ; } ;

// Global options
Cli.prototype.commandKey = function( commandKeyName ) { this.commandKeyName = commandKeyName ; return this ; } ;
Cli.prototype.commandOptionsKey = function( commandOptionsKeyName ) { this.commandOptionsKeyName = commandOptionsKeyName ; return this ; } ;
Cli.prototype.negative = function( negativePrefix ) { this.negativePrefix = negativePrefix ; return this ; } ;
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

Cli.prototype.setIntro = function( value = true ) {
	this.playIntro = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'noIntro' , {
	get: function() { return this.setIntro( false ) ; }
} ) ;



// Commands
Cli.prototype.commandGroup = function( groupName ) {
	this.lastCommandGroup = groupName ;
	return this ;
} ;



Cli.prototype.command = function( names ) {
	var pseudoOption ;

	var subCli = new Cli( names ) ;
	subCli.group = this.lastCommandGroup ;

	if ( this.inheritOptions ) {
		Object.assign( subCli.aliasOptions , this.aliasOptions ) ;
		Object.assign( subCli.canonicalOptions , this.canonicalOptions ) ;
		subCli.argOptions = this.argOptions.slice() ;
		subCli.restArgsOption = this.restArgsOption ;
		subCli.options = this.options.slice() ;
	}

	subCli.aliases.forEach( alias => this.aliasCommands[ alias ] = subCli ) ;
	this.canonicalCommands[ subCli.canonical ] = subCli ;

	if ( ! this.commands.length ) {
		pseudoOption = new Option( this.commandKeyName , undefined , true ) ;
		pseudoOption.group = 'Arguments' ;
		pseudoOption.description = 'The action to execute' ;

		this.activeCli.argOptions.unshift( pseudoOption ) ;
		this.activeCli.canonicalOptions[ pseudoOption.canonical ] = pseudoOption ;
		this.activeCli.options.push( pseudoOption ) ;
	}

	this.commands.push( subCli ) ;
	this.activeCli = subCli ;

	return this ;
} ;



// Per CLI/Sub-CLI
Cli.prototype.usage = function( str ) { this.activeCli.usageString = str ; return this ; } ;



//Cli.prototype.group =	// <-- this is already a member property
Cli.prototype.optionGroup = function( groupName ) {
	this.activeCli.lastOptionGroup = groupName ;
	return this ;
} ;



function Option( names , defaultValue , isArg ) {
	if ( ! Array.isArray( names ) ) { names = [ names ] ; }

	this.isArg = !! isArg ;
	this.canonical = names[ 0 ] ;
	this.aliases = names.slice( 1 ) ;
	this.default = defaultValue ;
	this.type = 'auto' ;
	this.isArrayOf = false ;
	this.sanitizer = noop ;
	this.mandatory = false ;
	this.exclusive = false ;
	this.description = null ;
	this.group = null ;
	this.execFn = null ;
}



Cli.prototype.opt =
Cli.prototype.option = function( names , defaultValue ) {
	var option = new Option( names , defaultValue ) ;
	option.group = this.activeCli.lastOptionGroup ;

	this.activeCli.flagOptions.push( option ) ;
	option.aliases.forEach( alias => this.activeCli.aliasOptions[ alias ] = option ) ;
	this.activeCli.canonicalOptions[ option.canonical ] = option ;
	this.activeCli.options.push( option ) ;
	this.activeCli.lastOption = option ;

	return this ;
} ;



Cli.prototype.arg =
Cli.prototype.argument = function( key , defaultValue ) {
	var option = new Option( key , defaultValue , true ) ;

	option.group = 'Arguments' ;

	this.activeCli.argOptions.push( option ) ;
	this.activeCli.canonicalOptions[ option.canonical ] = option ;
	this.activeCli.options.push( option ) ;
	this.activeCli.lastOption = option ;

	return this ;
} ;



Cli.prototype.restArgs =
Cli.prototype.restArguments = function( key , defaultEmptyArray ) {
	var option = new Option( key , defaultEmptyArray ? [] : undefined , true ) ;

	option.isArrayOf = true ;
	option.group = 'Arguments' ;

	this.restArgsKeyName = key ;

	this.activeCli.restArgsOption = option ;
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



Cli.prototype.setExclusive = function( value = true ) {
	if ( ! this.activeCli.lastOption ) { throw new Error( ".setExclusive() called before adding an option" ) ; }

	this.activeCli.lastOption.exclusive = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'exclusive' , {
	get: function() { return this.setExclusive() ; }
} ) ;



Cli.prototype.exec = function( fn ) {
	if ( ! this.activeCli.lastOption ) {
		this.activeCli.execFn = fn || null ;
	}
	else {
		this.activeCli.lastOption.execFn = fn || null ;
	}

	return this ;
} ;



Cli.prototype.setType = function( type ) {
	if ( ! this.activeCli.lastOption ) { throw new Error( ".setType() called before adding an option" ) ; }

	this.activeCli.lastOption.type = type ;
	return this ;
} ;

[ 'boolean' , 'string' , 'number' , 'object' ].forEach( type => {
	Object.defineProperty( Cli.prototype , type , {
		get: function() { return this.setType( type ) ; }
	} ) ;
} ) ;



Cli.prototype.setArrayOf = function( value = true ) {
	if ( ! this.activeCli.lastOption ) { throw new Error( ".setArrayOf() called before adding an option" ) ; }

	this.activeCli.lastOption.isArrayOf = !! value ;
	return this ;
} ;

Object.defineProperty( Cli.prototype , 'arrayOf' , {
	get: function() { return this.setArrayOf() ; }
} ) ;

Object.defineProperty( Cli.prototype , 'array' , {
	get: function() { return this.setArrayOf() ; }
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



// Set either the app description or the option description
Cli.prototype.details = function( str ) {
	this.activeCli.appDetails = str ;
	return this ;
} ;





/* Now the real thing */



Cli.prototype.parseOnly = function( raw = process.argv.slice( 2 ) , masterCli = this ) {
	var args = {} , part , chars , argOptionsIndex = 0 , index , j , indexOfEq , afterDoubleDash = false ,
		subCli , subCliArgs , error ;

	if ( this === masterCli ) { this.parsedArgs = args ; }

	var setKeyValue = ( key , value , strictCheck ) => {
		if ( this.aliasOptions[ key ] ) {
			key = this.aliasOptions[ key ].canonical ;
		}

		if ( key === masterCli.restArgsKeyName && ! args[ masterCli.restArgsKeyName ] ) {
			// If present, it is always an array
			args[ masterCli.restArgsKeyName ] = [] ;
		}

		if ( strictCheck && masterCli.strictMode && ! this.canonicalOptions[ key ] ) {
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

		if ( afterDoubleDash || part[ 0 ] !== '-' ) {
			if ( this.commands.length ) {
				// This is a command: start over inside the subCli
				subCli = this.canonicalCommands[ part ] || this.aliasCommands[ part ] ;

				if ( ! subCli ) {
					// Issue the error now, because we can't parse the end of the argument array
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
			else if ( this.restArgsOption ) {
				setKeyValue( this.restArgsOption.canonical , part ) ;
			}
			else if ( masterCli.strictMode ) {
				// We are in strict mode, but rest args where not defined!
				error = new Error( "Unknown argument #" + argOptionsIndex + " '" + part + "'" ) ;
				error.code = 'unknownArgument' ;
				error.key = argOptionsIndex ;
				error.what = part ;
				error.cli = this ;
				error.user = true ;
				throw error ;
			}
			else {
				setKeyValue( masterCli.restArgsKeyName , part ) ;
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
			afterDoubleDash = true ;
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
	this.parseOnly( raw ) ;
	this.postProcess() ;
	return this.parsedArgs ;
} ;



Cli.prototype.postProcess = function( args = this.parsedArgs ) {
	var subCli , subArgs , isCommand = false , error , option , hasExclusive = false ;

	this.toExec = [] ;

	if ( args[ this.commandKeyName ] ) {
		isCommand = true ;
		subCli = this.canonicalCommands[ args[ this.commandKeyName ] ] ;
		subArgs = this.commandSplit ? args[ this.commandOptionsKeyName ] : args ;
	}


	// Check each user option
	Object.keys( args ).forEach( key => {
		// We don't touch those keys
		if ( key === this.commandKeyName || key === this.commandOptionsKeyName ) {
			return ;
		}

		if ( isCommand && ! this.commandSplit ) {
			option = subCli.canonicalOptions[ key ] || this.canonicalOptions[ key ] ;
		}
		else {
			option = this.canonicalOptions[ key ] ;
		}

		if ( option ) {
			args[ key ] = this.cast( key , args[ key ] , option.type , option.isArrayOf ) ;

			if ( ! hasExclusive ) {
				if ( option.exclusive ) {
					hasExclusive = true ;

					if ( option.execFn ) {
						this.toExec.length = 0 ;	// Remove all non-exclusive functions
						this.toExec.push( option.execFn.bind( undefined , this , args ) ) ;
					}
				}
				else if ( option.execFn ) {
					this.toExec.push( option.execFn.bind( undefined , this , args ) ) ;
				}
			}
		}
		else if ( key === this.restArgsKeyName ) {
			return ;
		}
		else {
			// If unknown, cast to 'auto'
			args[ key ] = this.cast( key , args[ key ] , 'auto' ) ;
		}
	} ) ;

	if ( isCommand && subCli.execFn ) {
		this.toExec.push( subCli.execFn.bind( undefined , this , args , subCli , subArgs ) ) ;
	}

	if ( isCommand && this.commandSplit ) {
		// Check each command user option
		Object.keys( subArgs ).forEach( key => {

			option = subCli.canonicalOptions[ key ] ;

			if ( option ) {
				subArgs[ key ] = subCli.cast( key , subArgs[ key ] , option.type , option.isArrayOf ) ;

				if ( ! hasExclusive ) {
					if ( option.exclusive ) {
						hasExclusive = true ;

						if ( option.execFn ) {
							this.toExec.length = 0 ;	// Remove all non-exclusive functions
							this.toExec.push( option.execFn.bind( undefined , this , args , subCli , subArgs ) ) ;
						}
					}
					else if ( option.execFn ) {
						this.toExec.push( option.execFn.bind( undefined , this , args , subCli , subArgs ) ) ;
					}
				}
			}
			else if ( key === this.restArgsKeyName ) {
				return ;
			}
			else {
				// If unknown, cast to 'auto'
				subArgs[ key ] = subCli.cast( key , subArgs[ key ] , 'auto' ) ;
			}
		} ) ;
	}

	// Default values and mandatory check option existance
	this.options.forEach( option_ => {
		if ( ! ( option_.canonical in args ) ) {
			if ( option_.default !== undefined ) {
				args[ option_.canonical ] = option_.default ;
			}
			else if ( ! hasExclusive && option_.mandatory ) {
				error = new Error( "Mandatory option '" + option_.canonical + "' missing" ) ;
				error.code = 'missingOption' ;
				error.key = option_.canonical ;
				error.cli = this ;
				error.user = true ;
				throw error ;
			}
		}
	} ) ;

	// Check for command's mandatory option existance
	if ( isCommand ) {
		subCli.options.forEach( option_ => {
			if ( ! ( option_.canonical in subArgs ) ) {
				if ( option_.default !== undefined ) {
					subArgs[ option_.canonical ] = option_.default ;
				}
				else if ( ! hasExclusive && option_.mandatory ) {
					error = new Error( "Mandatory option '" + option_.canonical + "' missing" ) ;
					error.code = 'missingOption' ;
					error.key = option_.canonical ;
					error.cli = subCli ;
					error.user = true ;
					throw error ;
				}
			}
		} ) ;
	}

	// Function execution should be post-poned, or they would have non-sanitized data
	//this.toExec.forEach( fn => fn() ) ;

	return args ;
} ;



Cli.prototype.cast = function( key , value , type , isArrayOf = false ) {
	var error , casted ;

	if ( isArrayOf ) {
		if ( Array.isArray( value ) ) { casted = value ; }
		else if ( ! value || typeof value !== 'object' ) { casted = [ value ] ; }

		if ( Array.isArray( casted ) ) {
			return casted.map( e => this.cast( key , e , type ) ) ;
		}

		error = new Error( "Bad type for option '" + key + "', expecting an array but got '" + value +  "'" ) ;
		error.code = 'badType' ;
		error.key = key ;
		error.what = value ;
		error.cli = this ;
		error.user = true ;
		throw error ;
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
	}
} ;



Cli.prototype.run = function() {
	this.mergeInfo() ;

	try {
		this.parse() ;
	}
	catch ( error ) {
		if ( ! error.user ) { throw error ; }

		if ( this.playIntro ) { this.displayIntro() ; }
		this.displayUserError( error ) ;

		if ( error.user ) {
			this.displayHelp( error.cli , false ) ;
		}

		term( '\n' ) ;
		process.exit( 1 ) ;
	}

	this.toExec.forEach( fn => fn() ) ;

	if ( this.playIntro ) { this.displayIntro() ; }

	return this.parsedArgs ;
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



Cli.prototype.displayHelp = function( subCli = this , descriptionEnabled = true ) {
	// Generic description/summary
	if ( subCli.appDescription &&  descriptionEnabled ) {
		term( "%s" , subCli.appDescription )( '\n\n' ) ;
	}

	// Usage
	this.displayUsageHelp( subCli ) ;
	term( '\n' ) ;

	// Arguments
	if ( subCli.argOptions.length || subCli.restArgsOption ) {
		subCli.displayOptionsHelp( subCli.restArgsOption ? [ ... subCli.argOptions , subCli.restArgsOption ] : subCli.argOptions ) ;
		term( '\n' ) ;
	}

	// Flag-options
	if ( subCli.flagOptions.length ) {
		subCli.displayOptionsHelp( subCli.flagOptions ) ;
		term( '\n' ) ;
	}

	// Commands
	if ( subCli.commands.length ) {
		subCli.displayOptionsHelp( subCli.commands ) ;
		term( '\n' ) ;
	}

	// In-depth manual
	if ( subCli.appDetails ) {
		term( "%s" , string.wordwrap( subCli.appDetails , Math.min( 120 , term.width || 120 ) ) ) ;
		term( '\n' ) ;
	}
} ;



Cli.prototype.displayUsageHelp = function( subCli ) {
	var mandatoryOptions ,
		usage = subCli.usageString ;

	if ( ! usage ) {
		usage = [] ;

		// Command, if any, is already in the argOptions array

		// Arguments
		usage.push( ... subCli.argOptions.map( option => option.mandatory ? '[<' + option.canonical + '>]' : '<' + option.canonical + '>' ) ) ;
		if ( subCli.restArgsOption ) { usage.push( '[...]' ) ; }

		// Mandatory flags
		mandatoryOptions = this.flagOptions.filter( option => option.mandatory ) ;
		if ( subCli !== this ) { mandatoryOptions.push( ... subCli.flagOptions.filter( option => option.mandatory ) ) ; }

		usage.push( ... mandatoryOptions.map( option => {
			var optionStr = string.unicode.length( option.canonical ) > 1 ? '--' + option.canonical : '-' + option.canonical ;

			switch ( option.type ) {
				case 'string' :
					optionStr += ' <string>' ;
					break ;
				case 'number' :
					optionStr += ' <number>' ;
					break ;
			}

			return optionStr ;
		} ) ) ;

		usage = usage.join( ' ' ) ;
	}

	if ( subCli !== this ) {
		term( 'Usage is: %s %s %s' , this.appExe , subCli.canonical , usage ) ;
	}
	else {
		term( 'Usage is: %s %s' , this.appExe , usage ) ;
	}

	term( '\n' ) ;
} ;



Cli.prototype.displayOptionsHelp = function( list ) {
	var table , reformattedTable , altOptionsMaxWidth = 0 , descriptionMaxWidth = 0 ,
		leftColumnWidth , rightColumnWidth , fullWidth ,
		leftMargin , leftMarginString , rightMargin ,
		leftIndent , group = null ;

	table = [] ;

	list.forEach( option => {
		var isOption = option instanceof Option ;

		if ( option.group !== group ) {
			group = option.group ;
			table.push( [ group + ':' ] ) ;
		}

		var altOptions = [ option.canonical , ... option.aliases ].map( one => {
			if ( isOption ) {
				if ( option.isArg ) {
					if ( option.isArrayOf ) {
						return '[...]' ;
					}

					return '<' + one + '>' ;
				}

				return string.unicode.length( one ) > 1 ? '--' + one : '-' + one ;
			}

			return one ;
		} ).join( ', ' ) ;

		switch ( option.type ) {
			case 'string' :
				altOptions += option.isArg ? ' (string)' : ' <string>' ;
				break ;
			case 'number' :
				altOptions += option.isArg ? ' (number)' : ' <number>' ;
				break ;
		}

		var altOptionsWidth = string.unicode.width( altOptions ) ;
		if ( altOptionsWidth > altOptionsMaxWidth ) { altOptionsMaxWidth = altOptionsWidth ; }

		var description = ''
			+ ( isOption ? option.description : option.appDescription )
			+ ( isOption && option.mandatory ? ' [required]' : '' ) ;

		var descriptionWidth = string.unicode.width( description ) ;
		if ( descriptionWidth > descriptionMaxWidth ) { descriptionMaxWidth = descriptionWidth ; }

		table.push( [ altOptions , description ] ) ;
	} ) ;

	leftIndent = 4 ;
	leftMargin = 2 ;
	leftMarginString = ' '.repeat( leftMargin ) ;
	rightMargin = 6 ;
	leftColumnWidth = Math.min( altOptionsMaxWidth + leftIndent , 40 , Math.floor( ( ( term.width || 120 ) - leftMargin - rightMargin ) / 3 ) ) ;
	rightColumnWidth = Math.min( descriptionMaxWidth , 80 , Math.floor( ( ( term.width || 120 ) - leftMargin - rightMargin ) * 2 / 3 ) ) ;
	fullWidth = Math.min( 120 , term.width || 120 ) ;

	reformattedTable = [] ;

	table.forEach( line => {
		if ( line.length === 1 ) {
			// This is a group, taking up the full width
			var fullLines = string.wordwrap( line[ 0 ] , { width: fullWidth , noJoin: true } ) ;
			fullLines.forEach( fullLine => {
				reformattedTable.push( [ fullLine ] ) ;
			} ) ;
			return ;
		}

		var leftLines = string.wordwrap( line[ 0 ] , { width: leftColumnWidth - leftIndent , noJoin: true } ) ;
		var rightLines = string.wordwrap( line[ 1 ] , { width: rightColumnWidth , noJoin: true } ) ;

		if ( leftLines.length >= rightLines.length ) {
			leftLines.forEach( ( leftLine , index ) => {
				reformattedTable.push( [
					( index ? ' '.repeat( leftIndent ) : '' ) + leftLine ,
					rightLines[ index ] || ''
				] ) ;
			} ) ;
		}
		else {
			rightLines.forEach( ( rightLine , index ) => {
				reformattedTable.push( [
					( index ? ' '.repeat( leftIndent ) : '' ) + ( leftLines[ index ] || '' ) ,
					rightLine
				] ) ;
			} ) ;
		}
	} ) ;

	reformattedTable.forEach( line => {
		if ( line.length === 1 ) {
			// This is a group, taking up the full width
			term( "%s" , line[ 0 ] ) ;
			term( '\n' ) ;
			return ;
		}

		var [ left , right ] = line ;

		/*
		// This does not works well when not inside a TTY (the move to column does not output spaces)
		term.column.gray( 1 + leftMargin , "%s" , left ) ;
		term.column.cyan( 1 + leftMargin + leftColumnWidth + rightMargin , "%s" , right ) ;
		*/

		// This is more universal
		term( leftMarginString ) ;
		term.gray( "%s" , left ) ;
		term( ' '.repeat( rightMargin + leftColumnWidth - string.unicode.width( left ) ) ) ;
		term.cyan( "%s" , right ) ;

		term( '\n' ) ;
	} ) ;
} ;



Cli.prototype.displayUserError = function( userError ) {
	term.red( "Command line error: %s." , userError.message )( '\n' ) ;
	term( '\n' ) ;
} ;



// This add some common options and their automatic process
Object.defineProperty( Cli.prototype , 'commonOptions' , {
	get: function() { return this.addCommonOptions() ; }
} ) ;



Cli.prototype.addCommonOptions = function() {
	this.opt( [ 'help' , 'h' ] ).boolean
		.description( 'Display help and exit' )
		.exec( ( ... args ) => this.commonHelp( ... args ) ) ;

	this.opt( [ 'quiet' , 'q' ] ).boolean
		.description( 'Do not log or output unimportant informations' )
		.exec( ( ... args ) => this.commonQuiet( ... args ) ) ;

	this.lastOption = null ;

	return this ;
} ;



// This add some common command and their automatic process
Object.defineProperty( Cli.prototype , 'commonCommands' , {
	get: function() { return this.addCommonCommands() ; }
} ) ;



Cli.prototype.addCommonCommands = function() {
	if ( this.lastOption || this.activeCli !== this ) {
		throw new Error( ".addCommonCommands() should be invoked before any option/command definition" ) ;
	}

	this.command( 'help' )
		.description( 'Display help and exit' )
		.exec( ( ... args ) => this.commonHelpCommand( ... args ) )
		.arg( 'command-name' ).string.description( "The command to get help on" ) ;

	this.activeCli = this ;

	return this ;
} ;



Cli.prototype.commonHelp = function( cli , args , subCli , subArgs ) {
	this.displayIntro() ;

	if ( subCli ) {
		// Called from a sub CLI
		this.displayHelp( subCli ) ;
	}
	else if ( args[ this.commandKeyName ] ) {
		// Called from the master CLI as a top-level option, but there is actually a command
		this.displayHelp( this.canonicalCommands[ args[ this.commandKeyName ] ] ) ;
	}
	else {
		// Called from the master CLI, no command
		this.displayHelp() ;
	}

	term( '\n' ) ;
	process.exit() ;
} ;



Cli.prototype.commonQuiet = function( cli , args , subCli , subArgs ) {
	this.playIntro = false ;
} ;



Cli.prototype.commonHelpCommand = function( cli , args , subCli , subArgs ) {
	this.displayIntro() ;

	if ( subArgs['command-name'] ) {
		if ( this.canonicalCommands[ subArgs['command-name'] ] ) {
			this.displayHelp( this.canonicalCommands[ subArgs['command-name'] ] ) ;
		}
		else {
			term.red( "Unknown command '%s'" , subArgs['command-name'] ) ;
			term( '\n\n' ) ;

			this.displayHelp( this , false ) ;
		}
	}
	else {
		this.displayHelp() ;
	}

	term( '\n' ) ;
	process.exit() ;
} ;



// Create a default parser, add Cli to prototype, so it is possible to instanciate our own Cli
Cli.prototype.Cli = Cli ;
module.exports = new Cli() ;

