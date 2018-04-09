var expect = require('chai').expect
var sayHello = require('../world').sayHello

describe('src.lib.hello.world', function() {
  describe('world', function() {
    it('should return "Hello!"', function() {
      expect(sayHello()).to.be.equal('Hello!')
    })
  })
})
