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



const Cli = require( '..' ).cli.Cli ;



describe( "Raw parser" , () => {
	
	var cli = new Cli() ;
	
	it( "without flags" , () => {
		expect( cli.parse( [] ) ).to.equal( {} ) ;
		expect( cli.parse( [ 'file.txt' ] ) ).to.equal( { _: [ 'file.txt' ] } ) ;
		expect( cli.parse( [ 'source.txt' , 'destination.txt' ] ) ).to.equal( { _: [ 'source.txt' , 'destination.txt' ] } ) ;
		expect( cli.parse( [ 'one' , 'two' , 'three' ] ) ).to.equal( { _: [ 'one' , 'two' , 'three' ] } ) ;
	} ) ;
	
	it( "single char flags only" , () => {
		expect( cli.parse( [ '-f' ] ) ).to.equal( { f: true } ) ;
		expect( cli.parse( [ '-f' , '-o' ] ) ).to.equal( { f: true , o: true } ) ;
		expect( cli.parse( [ '-f' , '-o' , '-b' ] ) ).to.equal( { f: true , o: true , b: true } ) ;
	} ) ;
	
	it( "grouped single char flags" , () => {
		expect( cli.parse( [ '-fo' ] ) ).to.equal( { f: true , o: true } ) ;
		expect( cli.parse( [ '-fob' ] ) ).to.equal( { f: true , o: true , b: true } ) ;
		expect( cli.parse( [ '-fob' , '-aze' ] ) ).to.equal( { f: true , o: true , b: true , a: true , z: true , e: true } ) ;
	} ) ;
	
	it( "single char key and value" , () => {
		expect( cli.parse( [ '-o' , 'output' ] ) ).to.equal( { o: 'output' } ) ;
		expect( cli.parse( [ '-i' , 'input' , '-o' , 'output' ] ) ).to.equal( { i: 'input' , o: 'output' } ) ;
	} ) ;
	
	it( "grouped single char flags ending with a key/value" , () => {
		expect( cli.parse( [ '-xvzfi' , 'src' ] ) ).to.equal( { x: true , v: true , z: true , f: true , i: 'src' } ) ;
		expect( cli.parse( [ '-xvzfi' , 'src' , '-to' , 'dest' ] ) ).to.equal( { x: true , v: true , z: true , f: true , t: true , i: 'src' , o: 'dest' } ) ;
	} ) ;

	it( "long flags only" , () => {
		expect( cli.parse( [ '--force' ] ) ).to.equal( { force: true } ) ;
		expect( cli.parse( [ '--force' , '--optimize' ] ) ).to.equal( { force: true , optimize: true } ) ;
		expect( cli.parse( [ '--force' , '--optimize' , '--build' ] ) ).to.equal( { force: true , optimize: true , build: true } ) ;
	} ) ;
	
	it( "long negative flags only" , () => {
		expect( cli.parse( [ '--no-force' ] ) ).to.equal( { force: false } ) ;
		expect( cli.parse( [ '--no-force' , '--no-optimize' ] ) ).to.equal( { force: false , optimize: false } ) ;
		expect( cli.parse( [ '--no-force' , '--no-optimize' , '--no-build' ] ) ).to.equal( { force: false , optimize: false , build: false } ) ;
	} ) ;
	
	it( "long key and value" , () => {
		expect( cli.parse( [ '--output' , 'dest' ] ) ).to.equal( { output: 'dest' } ) ;
		expect( cli.parse( [ '--input' , 'src' , '--output' , 'dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
	} ) ;
	
	it( "long key and value in one part, separated by '='" , () => {
		expect( cli.parse( [ '--output=dest' ] ) ).to.equal( { output: 'dest' } ) ;
		expect( cli.parse( [ '--input=src' , '--output=dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
	} ) ;
	
	it( "remainder values after a '--'" , () => {
		expect( cli.parse( [ '--force' , '--' , 'value' ] ) ).to.equal( { force: true , _: [ 'value' ] } ) ;
		expect( cli.parse( [ '--force' , '--' , 'value1' , 'value2' , 'value3'] ) ).to.equal( { force: true , _: [ 'value1' , 'value2' , 'value3' ] } ) ;
		expect( cli.parse( [ '--force' , '--' , '--optimize' ] ) ).to.equal( { force: true , _: [ '--optimize' ] } ) ;
		expect( cli.parse( [ '--force' , '--' , '--optimize' , 'val' , '--opt' ] ) ).to.equal( { force: true , _: [ '--optimize' , 'val' , '--opt' ] } ) ;
		expect( cli.parse( [ '--force' , '--' , '--optimize' , 'val' , '--' , '--opt' ] ) ).to.equal( { force: true , _: [ '--optimize' , 'val' , '--' , '--opt' ] } ) ;
	} ) ;
	
	it( "auto-array on option repetition" , () => {
		expect( cli.parse( [ '--input' , 'first' , '--input' , 'second' ] ) ).to.equal( { input: [ 'first' , 'second' ] } ) ;
		expect( cli.parse( [ '--input' , 'first' , '--input' , 'second' , '--input' , 'third' ] ) ).to.equal( { input: [ 'first' , 'second' , 'third' ] } ) ;
	} ) ;
	
	it( "auto-objects when the key has a dot '.'" , () => {
		expect( cli.parse( [ '--path.to.key' , 'value' ] ) ).to.equal( { path: { to: { key: 'value' } } } ) ;
		expect( cli.parse( [ '--path.to.key1' , 'value1' , '--path.to.key2' , 'value2' ] ) ).to.equal( { path: { to: { key1: 'value1' , key2: 'value2' } } } ) ;
		expect( cli.parse( [ '--path.to.key1' , 'value1' , '--path.to.key2=value2' ] ) ).to.equal( { path: { to: { key1: 'value1' , key2: 'value2' } } } ) ;
	} ) ;
	
	it( "auto-array when the key has brackets '[]'" , () => {
		expect( cli.parse( [ '--array[1]' , 'value' ] ) ).to.equal( { array: [ undefined , 'value' ] } ) ;
		expect( cli.parse( [ '--array[1]' , 'value' , '--array[3]' , 'value2' ] ) ).to.equal( { array: [ undefined , 'value' , undefined , 'value2' ] } ) ;
		expect( cli.parse( [ '--array[0][0]' , 'value' ] ) ).to.equal( { array: [ [ 'value' ] ] } ) ;
	} ) ;
	
	it( "auto-types" , () => {
		expect( cli.parse( [ '--flag' ] ) ).to.equal( { flag: true } ) ;
		expect( cli.parse( [ '--no-flag' ] ) ).to.equal( { flag: false } ) ;
		expect( cli.parse( [ '--string' , 'value' ] ) ).to.equal( { string: 'value' } ) ;
		expect( cli.parse( [ '--num' , '123' ] ) ).to.equal( { num: 123 } ) ;
		expect( cli.parse( [ '--notnum' , '123abc' ] ) ).to.equal( { notnum: '123abc' } ) ;
		expect( cli.parse( [ '--array' , 'value1' , '--array' , 'value2' , '--array' , 'value3' ] ) ).to.equal( { array: [ 'value1' , 'value2' , 'value3' ] } ) ;
		expect( cli.parse( [ '--array' , '1' , '--array' , 'value2' , '--array' , '3' ] ) ).to.equal( { array: [ 1 , 'value2' , 3 ] } ) ;
		expect( cli.parse( [ '--path.to.key' , 'value' ] ) ).to.equal( { path: { to: { key: 'value' } } } ) ;
	} ) ;
	
	it( "mixing things up" , () => {
		expect( cli.parse( [ '--input' , 'src' , 'dest' ] ) ).to.equal( { input: 'src' , _: [ 'dest' ] } ) ;
		expect( cli.parse( [ 'dest' , '--input' , 'src' , 'more' , 'values' ] ) ).to.equal( { input: 'src' , _: [ 'dest' , 'more' , 'values' ] } ) ;
		expect( cli.parse( [ '-xvzfi' , 'src' , 'dest' ] ) ).to.equal( { x: true , v: true , z: true , f: true , i: 'src' , _: [ 'dest' ] } ) ;
		expect( cli.parse( [ '--input' , 'src' , '--output=dest' , 'more' ] ) ).to.equal( { input: 'src' , output: 'dest' , _: [ 'more' ] } ) ;
	} ) ;
} ) ;



describe( "Advanced parser options and post-processing" , () => {
	
	it( "options aliases" , () => {
		var cli = new Cli() ;
		
		cli
			.opt( [ 'input' , 'i' ] )
			.opt( [ 'output' , 'o' ] ) ;
		
		expect( cli.parse( [ '--input' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( cli.parse( [ '-i' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( cli.parse( [ '--input' , 'src1' , '-i' , 'src2' ] ) ).to.equal( { input: [ 'src1' , 'src2' ] } ) ;
	} ) ;
	
	it( "options key'd list arg" , () => {
		var cli = new Cli() ;
		
		cli
			.arg( 'input' )
			.arg( 'output' )
		
		expect( cli.parse( [ 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( cli.parse( [ 'src' , 'dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
		expect( cli.parse( [ 'src' , 'dest' , 'more' ] ) ).to.equal( { input: 'src' , output: 'dest' , _: [ 'more' ] } ) ;
		expect( cli.parse( [ '--name' , 'bob' , 'src' , 'dest' , 'more' ] ) ).to.equal( { name: 'bob' , input: 'src' , output: 'dest' , _: [ 'more' ] } ) ;
		expect( cli.parse( [ 'src' , '--name' , 'bob' , 'dest' , 'more' ] ) ).to.equal( { name: 'bob' , input: 'src' , output: 'dest' , _: [ 'more' ] } ) ;
		expect( cli.parse( [ '--input' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
	} ) ;
	
	it( "forbid unknown options with the 'strict' mode" , () => {
		var cli = new Cli() ;
		
		cli.strict
			.opt( [ 'input' , 'i' ] )
			.opt( [ 'output' , 'o' ] )
			.arg( 'logPath' ) ;
		
		expect( cli.parse( [ '--input' , 'src1' , '-i' , 'src2' ] ) ).to.equal( { input: [ 'src1' , 'src2' ] } ) ;
		expect( () => cli.parse( [ '--input' , 'src1' , '-i' , 'src2' , '--bad-opt' ] ) ).to.throw() ;
		expect( () => cli.parse( [ '--bad-opt' ] ) ).to.throw() ;
		expect( cli.parse( [ 'my.log' ] ) ).to.equal( { logPath: 'my.log' } ) ;
		expect( () => cli.parse( [ 'my.log' , 'extra' ] ) ).to.throw() ;
	} ) ;
	
	it( "mandatory options" , () => {
		var cli = new Cli() ;
		
		cli
			.opt( 'output' ).mandatory
			.arg( 'input' ).mandatory ;
		
		expect( cli.parse( [ 'src' , '--output' , 'dest' ] ) ).to.equal( { input: 'src' , output: 'dest' } ) ;
		expect( () => cli.parse( [ '--output' , 'dest' ] ) ).to.throw() ;
		expect( () => cli.parse( [ 'src' ] ) ).to.throw() ;
	} ) ;
	
	it( "options types" , () => {
		var cli = new Cli() ;
		cli.opt( 'flag' ).boolean
			.opt( 'num' ).number
			.opt( 'input' ).string
			.opt( 'object' ).object
			.opt( 'array' ).array
			.opt( 'stringArray' ).arrayOfStrings
			.opt( 'booleanArray' ).arrayOfBooleans
			.opt( 'numberArray' ).arrayOfNumbers
			;
		
		expect( cli.parse( [ '--input' , 'src' ] ) ).to.equal( { input: 'src' } ) ;
		expect( cli.parse( [ '--input' , 'yes' ] ) ).to.equal( { input: 'yes' } ) ;
		expect( () => cli.parse( [ '--input' ] ) ).to.throw() ;
		
		expect( cli.parse( [ '--flag' ] ) ).to.equal( { flag: true } ) ;
		expect( cli.parse( [ '--flag' , 'true' ] ) ).to.equal( { flag: true } ) ;
		expect( cli.parse( [ '--flag' , 'on' ] ) ).to.equal( { flag: true } ) ;
		expect( cli.parse( [ '--flag' , 'yes' ] ) ).to.equal( { flag: true } ) ;
		expect( cli.parse( [ '--no-flag' ] ) ).to.equal( { flag: false } ) ;
		expect( cli.parse( [ '--flag' , 'false' ] ) ).to.equal( { flag: false } ) ;
		expect( cli.parse( [ '--flag' , 'off' ] ) ).to.equal( { flag: false } ) ;
		expect( cli.parse( [ '--flag' , 'no' ] ) ).to.equal( { flag: false } ) ;
		expect( () => cli.parse( [ '--flag' , 'value' ] ) ).to.throw() ;
		
		expect( cli.parse( [ '--num' , '123' ] ) ).to.equal( { num: 123 } ) ;
		expect( cli.parse( [ '--num' , '123.456' ] ) ).to.equal( { num: 123.456 } ) ;
		expect( () => cli.parse( [ '--num' , 'value' ] ) ).to.throw() ;
		expect( () => cli.parse( [ '--num' , '123a' ] ) ).to.throw() ;
		expect( () => cli.parse( [ '--num' ] ) ).to.throw() ;
		
		expect( cli.parse( [ '--object.key' , 'value' ] ) ).to.equal( { object: { key: 'value' } } ) ;
		expect( () => cli.parse( [ '--object' , 'value' ] ) ).to.throw() ;
		
		expect( cli.parse( [ '--array' , 'value' ] ) ).to.equal( { array: [ 'value' ] } ) ;
		expect( cli.parse( [ '--array' , '1' , '--array' , '2' , '--array' , '3' ] ) ).to.equal( { array: [ 1,2,3 ] } ) ;
		expect( () => cli.parse( [ '--array.key' , 'value' ] ) ).to.throw() ;
		
		expect( cli.parse( [ '--stringArray' , 'value' ] ) ).to.equal( { stringArray: [ 'value' ] } ) ;
		expect( cli.parse( [ '--stringArray' , '1' , '--stringArray' , '2' , '--stringArray' , '3' ] ) )
			.to.equal( { stringArray: [ '1','2','3' ] } ) ;
		
		expect( cli.parse( [ '--booleanArray' ] ) ).to.equal( { booleanArray: [ true ] } ) ;
		expect( cli.parse( [ '--booleanArray' , 'true' ] ) ).to.equal( { booleanArray: [ true ] } ) ;
		expect( cli.parse( [ '--booleanArray' , 'false' , '--booleanArray' , '--booleanArray' , 'yes' , '--no-booleanArray' ] ) )
			.to.equal( { booleanArray: [ false , true , true , false ] } ) ;
		expect( () => cli.parse( [ '--booleanArray' , 'value' ] ) ).to.throw() ;
		
		expect( cli.parse( [ '--numberArray' , '1' ] ) ).to.equal( { numberArray: [ 1 ] } ) ;
		expect( cli.parse( [ '--numberArray' , '1' , '--numberArray' , '2' , '--numberArray' , '3' ] ) )
			.to.equal( { numberArray: [ 1,2,3 ] } ) ;
		expect( () => cli.parse( [ '--numberArray' , 'value' ] ) ).to.throw() ;
	} ) ;
	
	it( "commands with merged options" , () => {
		var cli = new Cli() ;
		
		cli.strict
			.opt( 'verbose' ).boolean
			.command( 'push' )
				.opt( 'tags' ).boolean
			.command( 'commit' )
				.opt( [ 'message' , 'm' ] ).string
				.arg( 'file' )
		
		expect( cli.parse( [ '--verbose' ] ) ).to.equal( { verbose: true } ) ;
		expect( cli.parse( [ 'push' ] ) ).to.equal( { command: 'push' } ) ;
		expect( () => cli.parse( [ 'push' , '--verbose' ] ) ).to.throw() ;
		expect( cli.parse( [ '--verbose=yes' , 'push' ] ) ).to.equal( { command: 'push' , verbose: true } ) ;
		expect( cli.parse( [ '--verbose' , '--' , 'push' ] ) ).to.equal( { command: 'push' , verbose: true } ) ;
		expect( () => cli.parse( [ 'omg' ] ) ).to.throw() ;
		expect( cli.parse( [ 'push' , '--tags' ] ) ).to.equal( { command: 'push' , tags: true } ) ;
		expect( cli.parse( [ '--verbose=yes' , 'push' , '--tags' ] ) ).to.equal( { command: 'push' , tags: true , verbose: true } ) ;
		expect( cli.parse( [ '--verbose' , '--' , 'push' , '--tags' ] ) ).to.equal( { command: 'push' , tags: true , verbose: true } ) ;
		expect( () => cli.parse( [ 'push' , '--oh-noooes' ] ) ).to.throw() ;
		expect( () => cli.parse( [ 'push' , 'oh-noooes' ] ) ).to.throw() ;
		expect( () => cli.parse( [ 'push' , '--message' ] ) ).to.throw() ;
		expect( () => cli.parse( [ 'push' , '--message' , 'wip' ] ) ).to.throw() ;
		expect( cli.parse( [ 'commit' , '--message' , 'wip' ] ) ).to.equal( { command: 'commit' , message: 'wip' } ) ;
		expect( () => cli.parse( [ 'commit' , '--tags' ] ) ).to.throw() ;
	} ) ;
	
	it( "commands with splitted options" , () => {
		var cli = new Cli() ;
		
		cli.strict.split
			.opt( 'verbose' ).boolean
			.command( 'push' )
				.opt( 'tags' ).boolean
			.command( 'commit' )
				.opt( [ 'message' , 'm' ] ).string
				.arg( 'file' )
		
		expect( cli.parse( [ '--verbose' ] ) ).to.equal( { verbose: true } ) ;
		expect( cli.parse( [ 'push' ] ) ).to.equal( { command: 'push' , commandOptions: {} } ) ;
		expect( () => cli.parse( [ 'push' , '--verbose' ] ) ).to.throw() ;
		expect( cli.parse( [ '--verbose=yes' , 'push' ] ) ).to.equal( { command: 'push' , verbose: true , commandOptions: {} } ) ;
		expect( cli.parse( [ '--verbose' , '--' , 'push' ] ) ).to.equal( { command: 'push' , verbose: true , commandOptions: {} } ) ;
		expect( cli.parse( [ 'push' , '--tags' ] ) ).to.equal( { command: 'push' , commandOptions: { tags: true } } ) ;
		expect( cli.parse( [ '--verbose=yes' , 'push' , '--tags' ] ) ).to.equal( { command: 'push' , commandOptions: { tags: true } , verbose: true } ) ;
		expect( cli.parse( [ '--verbose' , '--' , 'push' , '--tags' ] ) ).to.equal( { command: 'push' , commandOptions: { tags: true } , verbose: true } ) ;
		expect( cli.parse( [ 'commit' , '--message' , 'wip' ] ) ).to.equal( { command: 'commit' , commandOptions: { message: 'wip' } } ) ;
	} ) ;
	
	it( "commands with mandatory options" , () => {
		var cli ;
		
		cli = new Cli() ;
		
		cli.strict
			.opt( 'verbose' ).boolean
			.command( 'push' )
				.opt( 'tags' ).boolean
			.command( 'commit' )
				.opt( [ 'message' , 'm' ] ).string.mandatory
				.arg( 'file' )
		
		expect( cli.parse( [ '--verbose' ] ) ).to.equal( { verbose: true } ) ;
		expect( cli.parse( [ 'push' ] ) ).to.equal( { command: 'push' } ) ;
		expect( cli.parse( [ 'commit' , '--message' , 'wip' ] ) ).to.equal( { command: 'commit' , message: 'wip' } ) ;
		expect( () => cli.parse( [ 'commit' ] ) ).to.throw() ;
		
		cli = new Cli() ;
		
		cli.strict
			.opt( 'verbose' ).boolean.mandatory
			.command( 'push' )
				.opt( 'tags' ).boolean
			.command( 'commit' )
				.opt( [ 'message' , 'm' ] ).string.mandatory
				.arg( 'file' )
		
		expect( cli.parse( [ '--verbose' ] ) ).to.equal( { verbose: true } ) ;
		expect( () => cli.parse( [ 'push' ] ) ).to.throw() ;
		expect( cli.parse( [ '--verbose=yes' , 'push' ] ) ).to.equal( { verbose: true , command: 'push' } ) ;
		expect( () => cli.parse( [ 'commit' , '--message' , 'wip' ] ) ).to.throw() ;
		expect( cli.parse( [ '--verbose=yes' , 'commit' , '--message' , 'wip' ] ) ).to.equal( { verbose: true , command: 'commit' , message: 'wip' } ) ;
		expect( () => cli.parse( [ 'commit' ] ) ).to.throw() ;
	} ) ;
	
	it( "commands with splitted mandatory options" , () => {
		var cli ;
		
		cli = new Cli() ;
		
		cli.strict.split
			.opt( 'verbose' ).boolean
			.command( 'push' )
				.opt( 'tags' ).boolean
			.command( 'commit' )
				.opt( [ 'message' , 'm' ] ).string.mandatory
				.arg( 'file' )
		
		expect( cli.parse( [ '--verbose' ] ) ).to.equal( { verbose: true } ) ;
		expect( cli.parse( [ 'push' ] ) ).to.equal( { command: 'push' , commandOptions: {} } ) ;
		expect( cli.parse( [ 'commit' , '--message' , 'wip' ] ) ).to.equal( { command: 'commit' , commandOptions: { message: 'wip' } } ) ;
		expect( () => cli.parse( [ 'commit' ] ) ).to.throw() ;
		
		cli = new Cli() ;
		
		cli.strict.split
			.opt( 'verbose' ).boolean.mandatory
			.command( 'push' )
				.opt( 'tags' ).boolean
			.command( 'commit' )
				.opt( [ 'message' , 'm' ] ).string.mandatory
				.arg( 'file' )
		
		expect( cli.parse( [ '--verbose' ] ) ).to.equal( { verbose: true } ) ;
		expect( () => cli.parse( [ 'push' ] ) ).to.throw() ;
		expect( cli.parse( [ '--verbose=yes' , 'push' ] ) ).to.equal( { verbose: true , command: 'push' , commandOptions: {} } ) ;
		expect( () => cli.parse( [ 'commit' , '--message' , 'wip' ] ) ).to.throw() ;
		expect( cli.parse( [ '--verbose=yes' , 'commit' , '--message' , 'wip' ] ) ).to.equal( { verbose: true , command: 'commit' , commandOptions: { message: 'wip' } } ) ;
		expect( () => cli.parse( [ 'commit' ] ) ).to.throw() ;
	} ) ;
} ) ;

