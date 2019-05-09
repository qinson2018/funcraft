'use strict';

const pkg = require('../package.json');

const uuid = require('uuid');

var ua = require('universal-analytics');
const Conf = require('conf');
const { yellow } = require('colors');
const osName = require('os-name');
const getProfileFromFile = require('../lib/profile').getProfileFromFile;

const os = osName();
const packageName = pkg.name;
const nodeVersion = process.version;
const appVersion = this.packageVersion;

const conf = new Conf({
  configName: `ga-${packageName}`,
  defaults: {
    cid: uuid.v4()
  }
});

process.on('unhandledRejection', error => {
  require('../lib/exception-handler')(error);
});

var fake = {
  pageview: () => {
    return {
      send: () => { }
    }
  },
    event: () => {
      return {
        send: () => { }
      }
    }
};

var real = ua('UA-139704598-1', conf.get('cid'));
  
real.set('cd1', os);
real.set('cd2', nodeVersion);
real.set('cd3', appVersion);

var visitor;

async function getVisitor(returnFakeIfMissingConfig = false) {

  if (!visitor) {
    const profile = await getProfileFromFile();

    if (profile.report === undefined) {
      if (returnFakeIfMissingConfig) return fake;
      real.pageview('/downloaded').send();
      throw new Error(`Please re-execute ${yellow('fun config')} command`);
    }
  
    if (profile.report === true) {
      visitor = real;
    } else {
      visitor = fake;
    }
  } 
  
  return visitor;
}

module.exports = { getVisitor };