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



const Parser = require( '..' ).options.Parser ;



describe( "Raw parser" , () => {
	
	var parser = new Parser() ;
	
	it( "without flags" , () => {
		expect( parser.parse( [] ) ).to.equal( {} ) ;
		expect( parser.parse( [ 'file.txt' ] ) ).to.equal( { _: [ 'file.txt' ] } ) ;
		expect( parser.parse( [ 'source.txt' , 'destination.txt' ] ) ).to.equal( { _: [ 'source.txt' , 'destination.txt' ] } ) ;
		expect( parser.parse( [ 'one' , 'two' , 'three' ] ) ).to.equal( { _: [ 'one' , 'two' , 'three' ] } ) ;
	} ) ;
	
	it( "single char flags only" , () => {
		expect( parser.parse( [ '-f' ] ) ).to.equal( { f: true } ) ;
		expect( parser.parse( [ '-f' , '-o' ] ) ).to.equal( { f: true , o: true } ) ;
		expect( parser.parse( [ '-f' , '-o' , '-b' ] ) ).to.equal( { f: true , o: true , b: true } ) ;
	} ) ;
	
	it( "grouped single char flags" , () => {
		expect( parser.parse( [ '-fo' ] ) ).to.equal( { f: true , o: true } ) ;
		expect( parser.parse( [ '-fob' ] ) ).to.equal( { f: true , o: true , b: true } ) ;
		expect( parser.parse( [ '-fob' , '-aze' ] ) ).to.equal( { f: true , o: true , b: true , a: true , z: true , e: true } ) ;
	} ) ;
	
	it( "single char key and value" , () => {
		expect( parser.parse( [ '-o' , 'output' ] ) ).to.equal( { o: 'output' } ) ;
		expect( parser.parse( [ '-i' , 'input' , '-o' , 'output' ] ) ).to.equal( { i: 'input' , o: 'output' } ) ;
	} ) ;
	
	it( "long flags only" , () => {
		expect( parser.parse( [ '--force' ] ) ).to.equal( { force: true } ) ;
		expect( parser.parse( [ '--force' , '--optimize' ] ) ).to.equal( { force: true , optimize: true } ) ;
		expect( parser.parse( [ '--force' , '--optimize' , '--build' ] ) ).to.equal( { force: true , optimize: true , build: true } ) ;
	} ) ;
	
	it( "long key and value" , () => {
		expect( parser.parse( [ '--output' , 'dest' ] ) ).to.equal( { output: 'dest' } ) ;
		expect( parser.parse( [ '--input' , 'src' , '--output' , 'dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
	} ) ;
} ) ;


