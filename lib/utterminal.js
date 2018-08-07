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
//const lazy = require( 'lazyness' ) ;

function noop() {}



function Parser( optArray , options = {} ) {
	this.raw = optArray || process.argv.slice( 2 ) ;
	this.packageJson = null ;
	this.listKey = '_' ;	// porperty name of the array where to put non-keyed options
	this.negativePrefix = 'no-' ;
	
	this.aliasOptions = {} ;
	this.canonicalOptions = {} ;
	this.options = [] ;
} ;



// Setters
Parser.prototype.package = function( packageJson ) { this.packageJson = packageJson ; } ;
Parser.prototype.list = function( listKey ) { this.listKey = listKey ; } ;
Parser.prototype.negative = function( negativePrefix ) { this.negativePrefix = negativePrefix ; } ;



function Option( names , type , defaultValue , mandatory ) {
	if ( ! Array.isArray( names ) ) { names = [ names ] ; }
	
	this.canonical = names[ 0 ] ;
	this.aliases = names.slice( 1 ) ;
	this.sanitizer = noop ;
	this.default = defaultValue ;
	this.mandatory = !! mandatory ;
	
	if ( typeof type === 'function' ) {
		this.sanitizer = type ;
	}
	else if ( typeof type === 'string' ) {
		this.sanitizer = value => doormen( { sanitize: 'to' + type[ 0 ].toUpperCase() + type.slice( 1 ) } , value ) ;
	}
	else if ( type && typeof type === 'object' ) {
		this.sanitizer = value => doormen( type , value ) ;
	}
}



Parser.prototype.opt = Parser.prototype.option = function( names , type , defaultValue , mandatory ) {
	var option = new Option( names , type , defaultValue , mandatory ) ;
	
	option.aliases.forEach( alias => this.aliasOptions[ alias ] = option ) ;
	this.canonialOptions[ option.canonical ] = option ;
	this.options.push( option ) ;
} ;




Parser.prototype.parse = function() {
	var args = {} ;
	
	if ( this.noKey ) {
		args[ this.noKey ] = this.raw ;
	}
	
	return args ;
} ;



// Create a default parser, add Parser to prototype, so it is possible to instanciate our own Parser
Parser.prototype.Parser = Parser ;
module.exports = new Parser() ;

