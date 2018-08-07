#!/usr/bin/env node

var term = require( 'terminal-kit' ).terminal ;
var args = require( '..' ).parse() ;

term( "CLI options: %Y\n" , args ) ;


