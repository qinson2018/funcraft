'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const file = require('./common/file');
const { isSpringBootJar } = require('./common/spring-boot');

const springboot = {
  'id': 'springboot',
  'runtime': 'java',
  'website': 'https://spring.io/projects/spring-boot/',
  'detectors': {
    'or': [
      {
        'type': 'regex',
        'path': 'pom.xml',
        'content': '<artifactId>\\s*spring-boot-starter-parent\\s*</artifactId>'
      },
      {
        'type': 'file',
        'path': /\.jar$/
      }
    ]
  },
  'actions': [
    {
      'condition': {
        'and': [
          {
            'type': 'file',
            'path': /\.jar$/
          }
        ]
      },
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            const jars = await file.listDir(codeDir, /\.jar$/);

            if (jars.length > 1) {
              throw new Error('We detected you have more than 1 jar in current folder.');
            }
            
            const jar = jars[0];
            
            if (!await isSpringBootJar(jar)) {
              throw new Error('Only Spring Boot jar is supported');
            }

            const bootstrap = `#!/usr/bin/env bash
export PORT=9000
java -jar -Dserver.port=$PORT ${path.relative(codeDir, jar)}
`;
            
            await fs.writeFile('bootstrap', bootstrap, {
              mode: '0755'
            });
          }
        }
      ]
    },
    {
      'condition': true,
      'description': 'find jar under target/ and generate bootstrap',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            const targetPath = path.join(codeDir, 'target');

            if (!await fs.pathExists(targetPath)) {
              throw new Error(`You must package your SpringBoot project before deploying.
You can use 'mvn package' to package SpringBoot to a jar.`);
            }
            const targetContents = await fs.readdir(targetPath);

            let jarFiles = [];

            for (const file of targetContents) {
              if (_.endsWith(file, '.jar')) {
                const absFile = path.join(targetPath, file);
                const relative = path.relative(codeDir, absFile);
                jarFiles.push(relative);
              }
            }

            if (jarFiles.length === 0) {
              throw new Error(`Could not find any jar from 'target' folder.
You can use 'mvn package' to package SpringBoot to a jar.`);
            }

            if (jarFiles.length > 1) {
              throw new Error(`Found more than one jar files from 'target' folder`);
            }

            const bootstrap = `#!/usr/bin/env bash
export PORT=9000
java -jar -Dserver.port=$PORT ${jarFiles[0]}
`;

            await fs.writeFile('bootstrap', bootstrap, {
              mode: '0755'
            });
          }
        }
      ]
    }
  ]
};

module.exports = springboot;