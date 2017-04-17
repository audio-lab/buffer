'use strict';

var AudioBuffer = require('./');
var assert = require('assert');
var now = require('performance-now');
var pcm = require('pcm-util');
var extend = require('xtend/mutable');
var stream = require('stream');
var NDArray = require('ndarray');
var ctx = require('audio-context');
var isBrowser = require('is-browser');
var t = require('tape')

t('from Array', function (t) {
	var buffer = new AudioBuffer([
		0, 1, 0, 1, 0, 1
	]);

	t.deepEqual(buffer.getChannelData(0), [0, 1, 0]);
	t.deepEqual(buffer.getChannelData(1), [1, 0, 1]);
	t.end()
});

t('params edge case', function (t) {
	var a = AudioBuffer(2, {isWAA: false})
	t.deepEqual(a.length, 2)

	var b = new AudioBuffer(2, {isWAA: false})
	t.deepEqual(b.length, 2)
	t.end()
});

t('from Float32Array', function (t) {
	var buffer = new AudioBuffer(3, new Float32Array([
		0, 1, 0, 1, 0, 1, 0, 1, 0
	]));

	t.deepEqual(buffer.getChannelData(0), [0, 1, 0]);
	t.deepEqual(buffer.getChannelData(1), [1, 0, 1]);
	t.deepEqual(buffer.getChannelData(2), [0, 1, 0]);
	t.end()
});

t('from Buffer', function (t) {
	var data = new Buffer(8*3);
	data.writeFloatLE(1.0, 0);
	data.writeFloatLE(-1.0, 4);
	data.writeFloatLE(0.5, 8);
	data.writeFloatLE(-0.5, 12);
	data.writeFloatLE(-1, 16);
	data.writeFloatLE(0.5, 20);

	var buffer = AudioBuffer(3, data, {floatArray: Float32Array})

	t.deepEqual(buffer.getChannelData(0), [1, -1.0]);
	t.deepEqual(buffer.getChannelData(1), [0.5, -0.5]);
	t.deepEqual(buffer.getChannelData(2), [-1, 0.5]);
	t.end()
});

t('from AudioBuffer', function (t) {
	var a1 = AudioBuffer([1,-1,0.5,-0.5]);
	var a2 = AudioBuffer(a1);
	var a3 = AudioBuffer(a1);

	t.notEqual(a1, a2);
	t.notEqual(a1, a3);
	t.deepEqual(a3.getChannelData(1), [0.5,-0.5]);

	a1.getChannelData(0)[0] = 0;
	t.deepEqual(a1.getChannelData(0), [0,-1]);
	t.deepEqual(a2.getChannelData(0), [1,-1]);
	t.end()
});

t('from ArrayBuffer', function (t) {
	var a = AudioBuffer( (new Float32Array([1,-1,0.5,-0.5])).buffer, {floatArray: Float32Array} );
	t.deepEqual(a.getChannelData(1), [0.5,-0.5]);
	t.deepEqual(a.getChannelData(0), [1,-1]);
	t.end()
});

t('from NDArray', function (t) {
	var a = AudioBuffer( new NDArray(new Float32Array([1,-1,0.5,-0.5]), [2,2]) );
	t.deepEqual(a.getChannelData(1), [0.5,-0.5]);
	t.deepEqual(a.getChannelData(0), [1,-1]);

	//FIXME: there might need more tests, like detection of ndarray dimensions etc
	t.end()
});

t('from Array of Arrays', function (t) {
	var a = AudioBuffer(2, [ [1, -1], [0.5,-0.5], [-1, 0.5] ] );
	t.deepEqual(a.getChannelData(1), [0.5,-0.5]);
	t.deepEqual(a.getChannelData(0), [1,-1]);

	var a = AudioBuffer([ [1, -1], [0.5,-0.5], [-1, 0.5] ] );
	t.deepEqual(a.getChannelData(1), [0.5,-0.5]);
	t.deepEqual(a.getChannelData(0), [1,-1]);
	t.deepEqual(a.getChannelData(2), [-1,0.5]);
	t.end()
});

if (isBrowser) t('from WAABuffer', function (t) {
	var buf = ctx.createBuffer(3, 2, 44100);

	buf.getChannelData(0).fill(1);
	buf.getChannelData(1).fill(-1);
	buf.getChannelData(2).fill(0);

	var a = AudioBuffer( 3, buf );
	t.deepEqual(a.getChannelData(2), [0,0]);
	t.deepEqual(a.getChannelData(1), [-1,-1]);
	t.deepEqual(a.getChannelData(0), [1,1]);

	//test that data is bound
	//NOTE: it seems that is shouldn’t - we can gracefully clone the buffer
	// buf.getChannelData(2).fill(0.5);
	// t.deepEqual(a.getChannelData(2), buf.getChannelData(2));

	t.end()
});

t('clone', function (t) {
	var a = new AudioBuffer(3, 10, 3000);
	var b = new AudioBuffer(a);
	var c = new AudioBuffer(2, a, 4000);

	t.notEqual(a, b);
	t.deepEqual(a.getChannelData(0), b.getChannelData(0));
	t.deepEqual(a.getChannelData(2), b.getChannelData(2));
	t.equal(b.numberOfChannels, 3);
	t.equal(b.sampleRate, 3000);
	t.equal(c.sampleRate, 4000);
	t.equal(c.numberOfChannels, 2);
	t.deepEqual(a.getChannelData(0), c.getChannelData(0));
	t.deepEqual(a.getChannelData(1), c.getChannelData(1));

	if (isBrowser) {
		var a = ctx.createBuffer(2,10,44100);
		var b = new AudioBuffer(a);

		t.notEqual(a, b);
		t.notEqual(a.getChannelData(0), b.getChannelData(0));
		t.deepEqual(a.getChannelData(0), b.getChannelData(0));
	}
	t.end()
});

t('subbuffer', function (t) {
	var a = new AudioBuffer(1, [0, .1, .2, .3])
	var b = new AudioBuffer(1, [a.getChannelData(0).subarray(1,2)], {isWAA: false})
	b.getChannelData(0)[0] = .4
	t.deepEqual(a.getChannelData(0), new Float32Array([0, .4, .2, .3]))
	t.end()
})

t('minimal viable buffer', function (t) {
	var a = new AudioBuffer();
	t.equal(a.length, 1);
	t.equal(a.numberOfChannels, 2);

	var b = new AudioBuffer(2);
	t.equal(b.length, 2);
	t.equal(b.numberOfChannels, 2);
	t.end()
});

t('duration', function (t) {
	var buffer = new AudioBuffer(1, Array(441));
	t.equal(buffer.duration, 0.01);
	t.end()
});

t('length', function (t) {
	var buffer = new AudioBuffer(1, Array(12));
	t.equal(buffer.length, 12);
	var buffer = new AudioBuffer(2, Array(12));
	t.equal(buffer.length, 6);
	var buffer = new AudioBuffer(3, Array(12));
	t.equal(buffer.length, 4);
	var buffer = new AudioBuffer(4, Array(12));
	t.equal(buffer.length, 3);
	var buffer = new AudioBuffer(6, Array(12));
	t.equal(buffer.length, 2);
	t.end()
});

t('sampleRate', function (t) {
	var buffer = new AudioBuffer(1, Array(441));
	t.equal(buffer.duration, 0.01);

	var buffer = new AudioBuffer(1, Array(441), 44100*2);
	t.equal(buffer.duration, 0.005);
	t.end()
});

t('getChannelData empty arrays', function (t) {
	var buffer = new AudioBuffer(1, Array(4).fill(0));

	t.deepEqual(buffer.getChannelData(0), [0,0,0,0]);
	t.end()
});

t('copyToChannel', function (t) {
	var a = new AudioBuffer(2, 40);
	var arr = new Float32Array(40);
	arr.fill(-0.5);

	a.copyToChannel(arr, 0, 0);

	t.deepEqual(arr, a.getChannelData(0));


	a.copyToChannel(arr, 1, 10);

	var zeros = new Float32Array(10);
	arr.set(zeros);

	t.deepEqual(arr, a.getChannelData(1));
	t.end()
});

t('copyFromChannel', function (t) {
	var a = new AudioBuffer(2, 40);
	var arr = new Float32Array(40);
	a.getChannelData(0).fill(-0.5);
	a.getChannelData(1).fill(0.5);
	a.getChannelData(1).set((new Float32Array(20)).fill(-0.5), 20);

	a.copyFromChannel(arr, 0);
	t.deepEqual(arr, a.getChannelData(0));

	a.copyFromChannel(arr, 1, 10);

	var fixture = Array(10).fill(0.5).concat(Array(30).fill(-0.5));

	t.deepEqual(arr, fixture);
	t.end()
});

