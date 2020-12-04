'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describeIt } from './describe-it.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sourceRelativePath = process.argv[2] || '../src';

const SOURCE_DIR = path.normalize(path.join(__dirname, sourceRelativePath));

const testFolder = async (dir) => {
  const paths = fs.readdirSync(dir);

  for (const nextPath of paths) {
    const testPath = path.normalize(path.join(dir, nextPath));

    const isDirectory =
      fs.existsSync(testPath) && fs.statSync(testPath).isDirectory();
    if (isDirectory) {
      await testFolder(testPath);
    }

    const isSpecFile = /.spec.js/.test(testPath);
    if (!isSpecFile) {
      continue;
    }

    const reportPath = path.join(
      testPath.split('.spec.js').join('.report.txt')
    );

    let report = '';

    // written to work with describeIt, not a general solution
    const outputIntercept = function () {
      for (const arg of arguments) {
        report += arg;
      }
    };

    const { describe, it } = describeIt(outputIntercept);
    global.describe = describe;
    global.it = it;

    try {
      await import(testPath);
    } catch (err) {
      report = err.toString();
    }

    const compressedReport = report.replace(/\n[ \t]{2,}\n/gim, '\n');

    // log the colored report to the console
    console.log(
      '--- ',
      testPath.replace(path.dirname(__dirname), ''),
      ' ---\n\n',
      compressedReport
    );

    // format the report for writing to a .report.txt file
    const destyled = compressedReport.replace(/\[[\d]+m/gm, '');
    const cleanedStacks = destyled
      .split(path.dirname(__dirname))
      .join(' [ ... ] ');
    fs.writeFile(reportPath, cleanedStacks, 'utf-8', (err) =>
      err ? console.error(err) : null
    );
  }
};

testFolder(SOURCE_DIR);
