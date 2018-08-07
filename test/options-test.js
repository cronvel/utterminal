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
	
	it( "grouped single char flags ending with a key/value" , () => {
		expect( parser.parse( [ '-xvzfi' , 'src' ] ) ).to.equal( { x: true , v: true , z: true , f: true , i: 'src' } ) ;
		expect( parser.parse( [ '-xvzfi' , 'src' , '-to' , 'dest' ] ) ).to.equal( { x: true , v: true , z: true , f: true , t: true , i: 'src' , o: 'dest' } ) ;
	} ) ;

	it( "long flags only" , () => {
		expect( parser.parse( [ '--force' ] ) ).to.equal( { force: true } ) ;
		expect( parser.parse( [ '--force' , '--optimize' ] ) ).to.equal( { force: true , optimize: true } ) ;
		expect( parser.parse( [ '--force' , '--optimize' , '--build' ] ) ).to.equal( { force: true , optimize: true , build: true } ) ;
	} ) ;
	
	it( "long negative flags only" , () => {
		expect( parser.parse( [ '--no-force' ] ) ).to.equal( { force: false } ) ;
		expect( parser.parse( [ '--no-force' , '--no-optimize' ] ) ).to.equal( { force: false , optimize: false } ) ;
		expect( parser.parse( [ '--no-force' , '--no-optimize' , '--no-build' ] ) ).to.equal( { force: false , optimize: false , build: false } ) ;
	} ) ;
	
	it( "long key and value" , () => {
		expect( parser.parse( [ '--output' , 'dest' ] ) ).to.equal( { output: 'dest' } ) ;
		expect( parser.parse( [ '--input' , 'src' , '--output' , 'dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
	} ) ;
	
	it( "long key and value in one part, separated by '='" , () => {
		expect( parser.parse( [ '--output=dest' ] ) ).to.equal( { output: 'dest' } ) ;
		expect( parser.parse( [ '--input=src' , '--output=dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
	} ) ;
	
	it( "remainder values after a '--'" , () => {
		expect( parser.parse( [ '--force' , '--' , 'value' ] ) ).to.equal( { force: true , _: [ 'value' ] } ) ;
		expect( parser.parse( [ '--force' , '--' , 'value1' , 'value2' , 'value3'] ) ).to.equal( { force: true , _: [ 'value1' , 'value2' , 'value3' ] } ) ;
		expect( parser.parse( [ '--force' , '--' , '--optimize' ] ) ).to.equal( { force: true , _: [ '--optimize' ] } ) ;
		expect( parser.parse( [ '--force' , '--' , '--optimize' , 'val' , '--opt' ] ) ).to.equal( { force: true , _: [ '--optimize' , 'val' , '--opt' ] } ) ;
		expect( parser.parse( [ '--force' , '--' , '--optimize' , 'val' , '--' , '--opt' ] ) ).to.equal( { force: true , _: [ '--optimize' , 'val' , '--' , '--opt' ] } ) ;
	} ) ;
	
	it( "auto-array on option repetition" , () => {
		expect( parser.parse( [ '--input' , 'first' , '--input' , 'second' ] ) ).to.equal( { input: [ 'first' , 'second' ] } ) ;
		expect( parser.parse( [ '--input' , 'first' , '--input' , 'second' , '--input' , 'third' ] ) ).to.equal( { input: [ 'first' , 'second' , 'third' ] } ) ;
	} ) ;
	
	it( "auto-objects when the key has a dot '.'" , () => {
		expect( parser.parse( [ '--path.to.key' , 'value' ] ) ).to.equal( { path: { to: { key: 'value' } } } ) ;
		expect( parser.parse( [ '--path.to.key1' , 'value1' , '--path.to.key2' , 'value2' ] ) ).to.equal( { path: { to: { key1: 'value1' , key2: 'value2' } } } ) ;
		expect( parser.parse( [ '--path.to.key1' , 'value1' , '--path.to.key2=value2' ] ) ).to.equal( { path: { to: { key1: 'value1' , key2: 'value2' } } } ) ;
	} ) ;
	
	it( "auto-array when the key has brackets '[]'" , () => {
		expect( parser.parse( [ '--array[1]' , 'value' ] ) ).to.equal( { array: [ undefined , 'value' ] } ) ;
		expect( parser.parse( [ '--array[1]' , 'value' , '--array[3]' , 'value2' ] ) ).to.equal( { array: [ undefined , 'value' , undefined , 'value2' ] } ) ;
		expect( parser.parse( [ '--array[0][0]' , 'value' ] ) ).to.equal( { array: [ [ 'value' ] ] } ) ;
	} ) ;
	
	it( "auto-types" , () => {
		expect( parser.parse( [ '--flag' ] ) ).to.equal( { flag: true } ) ;
		expect( parser.parse( [ '--no-flag' ] ) ).to.equal( { flag: false } ) ;
		expect( parser.parse( [ '--string' , 'value' ] ) ).to.equal( { string: 'value' } ) ;
		expect( parser.parse( [ '--num' , '123' ] ) ).to.equal( { num: 123 } ) ;
		expect( parser.parse( [ '--notnum' , '123abc' ] ) ).to.equal( { notnum: '123abc' } ) ;
		expect( parser.parse( [ '--array' , 'value1' , '--array' , 'value2' , '--array' , 'value3' ] ) ).to.equal( { array: [ 'value1' , 'value2' , 'value3' ] } ) ;
		expect( parser.parse( [ '--array' , '1' , '--array' , 'value2' , '--array' , '3' ] ) ).to.equal( { array: [ 1 , 'value2' , 3 ] } ) ;
		expect( parser.parse( [ '--path.to.key' , 'value' ] ) ).to.equal( { path: { to: { key: 'value' } } } ) ;
	} ) ;

	it( "mixing things up" , () => {
		expect( parser.parse( [ '--input' , 'src' , 'dest' ] ) ).to.equal( { input: 'src' , _: [ 'dest' ] } ) ;
		expect( parser.parse( [ 'dest' , '--input' , 'src' , 'more' , 'values' ] ) ).to.equal( { input: 'src' , _: [ 'dest' , 'more' , 'values' ] } ) ;
		expect( parser.parse( [ '-xvzfi' , 'src' , 'dest' ] ) ).to.equal( { x: true , v: true , z: true , f: true , i: 'src' , _: [ 'dest' ] } ) ;
		expect( parser.parse( [ '--input' , 'src' , '--output=dest' , 'more' ] ) ).to.equal( { input: 'src' , output: 'dest' , _: [ 'more' ] } ) ;
	} ) ;
} ) ;



describe( "Advanced parser options and post-processing" , () => {
	
	it( "options aliases" , () => {
		var parser = new Parser() ;
		parser.opt( [ 'input' , 'i' ] )
			.opt( [ 'output' , 'o' ] ) ;
		
		expect( parser.parse( [ '--input' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( parser.parse( [ '-i' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( parser.parse( [ '--input' , 'src1' , '-i' , 'src2' ] ) ).to.equal( { input: [ 'src1' , 'src2' ] } ) ;
	} ) ;
	
	it( "options types" , () => {
		var parser = new Parser() ;
		parser.opt( 'flag' ).boolean
			.opt( 'num' ).number
			.opt( 'input' ).string
			.opt( 'object' ).object
			.opt( 'array' ).array
			.opt( 'stringArray' ).arrayOfStrings
			.opt( 'booleanArray' ).arrayOfBooleans
			.opt( 'numberArray' ).arrayOfNumbers
			;
		
		expect( parser.parse( [ '--input' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( parser.parse( [ '--input' , 'yes' ] ) ).to.equal( { input: 'yes' } ) ;
		expect( () => parser.parse( [ '--input' ] ) ).to.throw() ;
		
		expect( parser.parse( [ '--flag' ] ) ).to.equal( { flag: true } ) ;
		expect( parser.parse( [ '--flag' , 'true' ] ) ).to.equal( { flag: true } ) ;
		expect( parser.parse( [ '--flag' , 'on' ] ) ).to.equal( { flag: true } ) ;
		expect( parser.parse( [ '--flag' , 'yes' ] ) ).to.equal( { flag: true } ) ;
		expect( parser.parse( [ '--no-flag' ] ) ).to.equal( { flag: false } ) ;
		expect( parser.parse( [ '--flag' , 'false' ] ) ).to.equal( { flag: false } ) ;
		expect( parser.parse( [ '--flag' , 'off' ] ) ).to.equal( { flag: false } ) ;
		expect( parser.parse( [ '--flag' , 'no' ] ) ).to.equal( { flag: false } ) ;
		expect( () => parser.parse( [ '--flag' , 'value' ] ) ).to.throw() ;
		
		expect( parser.parse( [ '--num' , '123' ] ) ).to.equal( { num: 123 } ) ;
		expect( parser.parse( [ '--num' , '123.456' ] ) ).to.equal( { num: 123.456 } ) ;
		expect( () => parser.parse( [ '--num' , 'value' ] ) ).to.throw() ;
		expect( () => parser.parse( [ '--num' , '123a' ] ) ).to.throw() ;
		expect( () => parser.parse( [ '--num' ] ) ).to.throw() ;
		
		expect( parser.parse( [ '--object.key' , 'value' ] ) ).to.equal( { object: { key: 'value' } } ) ;
		expect( () => parser.parse( [ '--object' , 'value' ] ) ).to.throw() ;
		
		expect( parser.parse( [ '--array' , 'value' ] ) ).to.equal( { array: [ 'value' ] } ) ;
		expect( parser.parse( [ '--array' , '1' , '--array' , '2' , '--array' , '3' ] ) ).to.equal( { array: [ 1,2,3 ] } ) ;
		expect( () => parser.parse( [ '--array.key' , 'value' ] ) ).to.throw() ;
		
		expect( parser.parse( [ '--stringArray' , 'value' ] ) ).to.equal( { stringArray: [ 'value' ] } ) ;
		expect( parser.parse( [ '--stringArray' , '1' , '--stringArray' , '2' , '--stringArray' , '3' ] ) )
			.to.equal( { stringArray: [ '1','2','3' ] } ) ;
		
		expect( parser.parse( [ '--booleanArray' ] ) ).to.equal( { booleanArray: [ true ] } ) ;
		expect( parser.parse( [ '--booleanArray' , 'true' ] ) ).to.equal( { booleanArray: [ true ] } ) ;
		expect( parser.parse( [ '--booleanArray' , 'false' , '--booleanArray' , '--booleanArray' , 'yes' , '--no-booleanArray' ] ) )
			.to.equal( { booleanArray: [ false , true , true , false ] } ) ;
		expect( () => parser.parse( [ '--booleanArray' , 'value' ] ) ).to.throw() ;
		
		expect( parser.parse( [ '--numberArray' , '1' ] ) ).to.equal( { numberArray: [ 1 ] } ) ;
		expect( parser.parse( [ '--numberArray' , '1' , '--numberArray' , '2' , '--numberArray' , '3' ] ) )
			.to.equal( { numberArray: [ 1,2,3 ] } ) ;
		expect( () => parser.parse( [ '--numberArray' , 'value' ] ) ).to.throw() ;
	} ) ;
} ) ;

