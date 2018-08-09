#!/usr/bin/env node
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



var term = require( 'terminal-kit' ).terminal ;
var string = require( 'string-kit' ) ;

function deb( description , variable ) {
	console.log( description + ':\n' + string.inspect( { style: 'color' } , variable ) ) ;
}

//deb( "argv" , process.argv ) ;

var cli = require( '..' ).cli
	.package( require( '../package.json' ) )
	.usage( 'Usage is: %s --name <name> [--age <age>]' )
	.commonCommands
	.commonOptions
	.optionGroup( 'ASV options' )
		.opt( [ "name" , "n" ] , "bob" ).string//.mandatory
		//.opt( [ "name" , "nsqmlfjkml" , "ansqmlfjkml" , "znsqmlfjkml" , "ensqmlfjkml" , "rnsqmlfjkml" , "tnsqmlfjkml" , "ynsqmlfjkml" , "unsqmlfjkml" , "insqmlfjkml" , "onsqmlfjkml" ] , "bob" ).string.mandatory
			.description( "your name" )
			//.description( "enter here your name enter here your name enter here your name enter here your name enter here your name enter here your name enter here your name" )
		.opt( [ "age" , "a" ] ).number
			.description( "your age" )
	.command( [ 'bob' , 'b' ] ) .description( 'It bobs everything up' )
		.opt( 'supa' ).boolean
			.description( 'Enhance bobbing even more' )
	;


/*
deb( "Parser" , cli ) ;
var args = cli.parse() ;
deb( "CLI options" , args ) ;
*/

var args = cli.run() ;
deb( "CLI options" , args ) ;

