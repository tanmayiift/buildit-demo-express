'use strict'

var assert = require('node:assert');
const { Buffer } = require('node:buffer');
var querystring = require('node:querystring');
var utils = require('../lib/utils');

describe('utils.etag(body, encoding)', function(){
  it('should support strings', function(){
    assert.strictEqual(utils.etag('express!'),
      '"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"')
  })

  it('should support utf8 strings', function(){
    assert.strictEqual(utils.etag('express❤', 'utf8'),
      '"a-JBiXf7GyzxwcrxY4hVXUwa7tmks"')
  })

  it('should support buffer', function(){
    assert.strictEqual(utils.etag(Buffer.from('express!')),
      '"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"')
  })

  it('should support empty string', function(){
    assert.strictEqual(utils.etag(''),
      '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
  })
})

describe('utils.normalizeType acceptParams method', () => {
  it('should handle a type with a malformed parameter and break the loop in acceptParams', () => {
    const result = utils.normalizeType('text/plain;invalid');
    assert.deepEqual(result,{
      value: 'text/plain',
      quality: 1,
      params: {} // No parameters are added since "invalid" has no "="
    });
  });

  it('should default to application/octet-stream when mime lookup fails', () => {
    const result = utils.normalizeType('unknown-extension-xyz');
    assert.deepEqual(result, {
      value: 'application/octet-stream',
      params: {}
    });
  });

  it('should default the quality to 1 when no params are given', () => {
    assert.deepStrictEqual(utils.normalizeType('text/html'), {
      value: 'text/html',
      quality: 1,
      params: {}
    });
  });

  it('should keep a wildcard type intact', () => {
    assert.deepStrictEqual(utils.normalizeType('*/*'), {
      value: '*/*',
      quality: 1,
      params: {}
    });
  });

  it('should read the quality from a "q" param', () => {
    assert.deepStrictEqual(utils.normalizeType('text/html;q=0.8'), {
      value: 'text/html',
      quality: 0.8,
      params: {}
    });
  });

  it('should collect every param other than "q"', () => {
    assert.deepStrictEqual(utils.normalizeType('application/json; q=0.5; level=1'), {
      value: 'application/json',
      quality: 0.5,
      params: { level: '1' }
    });
  });

  it('should collect multiple params', () => {
    assert.deepStrictEqual(utils.normalizeType('text/plain; a=1; b=2'), {
      value: 'text/plain',
      quality: 1,
      params: { a: '1', b: '2' }
    });
  });

  it('should trim surrounding whitespace from the value and params', () => {
    assert.deepStrictEqual(utils.normalizeType('  text/html  ;  charset=utf-8  '), {
      value: 'text/html',
      quality: 1,
      params: { charset: 'utf-8' }
    });
  });

  it('should not require whitespace after the separator', () => {
    assert.deepStrictEqual(utils.normalizeType('text/html;charset=utf-8'), {
      value: 'text/html',
      quality: 1,
      params: { charset: 'utf-8' }
    });
  });
});

describe('utils.normalizeTypes(types)', function () {
  it('should return an empty array for no types', function () {
    assert.deepStrictEqual(utils.normalizeTypes([]), []);
  });

  it('should normalize every extension in the list', function () {
    assert.deepStrictEqual(utils.normalizeTypes(['html', 'json']), [
      { value: 'text/html', params: {} },
      { value: 'application/json', params: {} }
    ]);
  });

  it('should normalize a mix of extensions and media types', function () {
    assert.deepStrictEqual(utils.normalizeTypes(['html', 'application/json;q=0.5']), [
      { value: 'text/html', params: {} },
      { value: 'application/json', quality: 0.5, params: {} }
    ]);
  });

  it('should leave the input array untouched', function () {
    var types = ['html', 'json'];
    utils.normalizeTypes(types);
    assert.deepStrictEqual(types, ['html', 'json']);
  });
});

describe('utils.setCharset(type, charset)', function () {
  it('should do anything without type', function () {
    assert.strictEqual(utils.setCharset(), undefined);
  });

  it('should return type if not given charset', function () {
    assert.strictEqual(utils.setCharset('text/html'), 'text/html');
  });

  it('should keep charset if not given charset', function () {
    assert.strictEqual(utils.setCharset('text/html; charset=utf-8'), 'text/html; charset=utf-8');
  });

  it('should set charset', function () {
    assert.strictEqual(utils.setCharset('text/html', 'utf-8'), 'text/html; charset=utf-8');
  });

  it('should override charset', function () {
    assert.strictEqual(utils.setCharset('text/html; charset=iso-8859-1', 'utf-8'), 'text/html; charset=utf-8');
  });
});

describe('utils.wetag(body, encoding)', function(){
  it('should support strings', function(){
    assert.strictEqual(utils.wetag('express!'),
      'W/"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"')
  })

  it('should support utf8 strings', function(){
    assert.strictEqual(utils.wetag('express❤', 'utf8'),
      'W/"a-JBiXf7GyzxwcrxY4hVXUwa7tmks"')
  })

  it('should support buffer', function(){
    assert.strictEqual(utils.wetag(Buffer.from('express!')),
      'W/"8-O2uVAFaQ1rZvlKLT14RnuvjPIdg"')
  })

  it('should support empty string', function(){
    assert.strictEqual(utils.wetag(''),
      'W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
  })
})

describe('utils.compileETag()', function () {
  it('should return a given function unchanged', function () {
    const fn = function () { return '"custom"'; };
    assert.strictEqual(utils.compileETag(fn), fn);
  });

  it('should return generateETag for true', function () {
    const fn = utils.compileETag(true);
    assert.strictEqual(fn('express!'), utils.wetag('express!'));
  });

  it('should return undefined for false', function () {
    assert.strictEqual(utils.compileETag(false), undefined);
  });

  it('should return generateETag for string values "strong" and "weak"', function () {
    assert.strictEqual(utils.compileETag('strong')("express"), utils.etag("express"));
    assert.strictEqual(utils.compileETag('weak')("express"), utils.wetag("express"));
  });

  it('should throw for unknown string values', function () {
    assert.throws(() => utils.compileETag('foo'), TypeError);
  });

  it('should throw for unsupported types like arrays and objects', function () {
    assert.throws(() => utils.compileETag([]), TypeError);
    assert.throws(() => utils.compileETag({}), TypeError);
  });
});

describe('utils.compileQueryParser()', function () {
  it('should return a given function unchanged', function () {
    const fn = function () { return {}; };
    assert.strictEqual(utils.compileQueryParser(fn), fn);
  });

  it('should return querystring.parse for true', function () {
    assert.strictEqual(utils.compileQueryParser(true), querystring.parse);
  });

  it('should return querystring.parse for "simple"', function () {
    assert.strictEqual(utils.compileQueryParser('simple'), querystring.parse);
  });

  it('should return undefined for false', function () {
    assert.strictEqual(utils.compileQueryParser(false), undefined);
  });

  it('should not expand nested keys with "simple"', function () {
    const parse = utils.compileQueryParser('simple');
    // querystring.parse returns a null-prototype object, so copy before comparing
    assert.deepStrictEqual({ ...parse('a[b]=c') }, { 'a[b]': 'c' });
  });

  it('should expand nested keys with "extended"', function () {
    const parse = utils.compileQueryParser('extended');
    assert.deepStrictEqual(parse('a[b]=c'), { a: { b: 'c' } });
  });

  it('should return an empty object for an empty query string', function () {
    assert.deepStrictEqual({ ...utils.compileQueryParser('simple')('') }, {});
    assert.deepStrictEqual(utils.compileQueryParser('extended')(''), {});
  });

  it('should throw for unknown string values', function () {
    assert.throws(() => utils.compileQueryParser('foo'),
      /unknown value for query parser function: foo/);
  });

  it('should throw for unsupported types like arrays and objects', function () {
    assert.throws(() => utils.compileQueryParser([]), TypeError);
    assert.throws(() => utils.compileQueryParser({}), TypeError);
  });

  it('should throw when no value is given', function () {
    assert.throws(() => utils.compileQueryParser(undefined), TypeError);
  });
});

describe('utils.compileTrust()', function () {
  it('should return a given function unchanged', function () {
    const fn = function () { return true; };
    assert.strictEqual(utils.compileTrust(fn), fn);
  });

  it('should trust every address for true', function () {
    const trust = utils.compileTrust(true);
    assert.strictEqual(trust('127.0.0.1', 0), true);
    assert.strictEqual(trust('192.168.0.1', 3), true);
  });

  it('should trust no address for false', function () {
    const trust = utils.compileTrust(false);
    assert.strictEqual(trust('127.0.0.1', 0), false);
    assert.strictEqual(trust('192.168.0.1', 0), false);
  });

  it('should trust no address when no value is given', function () {
    const trust = utils.compileTrust(undefined);
    assert.strictEqual(trust('127.0.0.1', 0), false);
  });

  it('should trust a number of hops', function () {
    const trust = utils.compileTrust(2);
    assert.strictEqual(trust('10.0.0.1', 0), true);
    assert.strictEqual(trust('10.0.0.1', 1), true);
    assert.strictEqual(trust('10.0.0.1', 2), false);
  });

  it('should trust nothing for a hop count of 0', function () {
    const trust = utils.compileTrust(0);
    assert.strictEqual(trust('10.0.0.1', 0), false);
  });

  it('should accept a comma-separated list of addresses', function () {
    const trust = utils.compileTrust('127.0.0.1,::1');
    assert.strictEqual(trust('127.0.0.1', 0), true);
    assert.strictEqual(trust('::1', 0), true);
    assert.strictEqual(trust('10.0.0.1', 0), false);
  });

  it('should trim the entries of a comma-separated list', function () {
    const trust = utils.compileTrust(' 127.0.0.1 ,  ::1 ');
    assert.strictEqual(trust('127.0.0.1', 0), true);
    assert.strictEqual(trust('::1', 0), true);
    assert.strictEqual(trust('10.0.0.1', 0), false);
  });

  it('should accept a named subnet', function () {
    const trust = utils.compileTrust('loopback');
    assert.strictEqual(trust('127.0.0.1', 0), true);
    assert.strictEqual(trust('10.0.0.1', 0), false);
  });

  it('should accept an array of CIDR ranges', function () {
    const trust = utils.compileTrust(['10.0.0.0/8']);
    assert.strictEqual(trust('10.1.2.3', 0), true);
    assert.strictEqual(trust('11.1.2.3', 0), false);
  });

  it('should throw for an invalid address', function () {
    assert.throws(() => utils.compileTrust('not-an-ip'), TypeError);
  });
});
