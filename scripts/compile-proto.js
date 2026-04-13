import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const OUT_DIR = './src/generated';

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const isWin = os.platform() === 'win32';
const protocGenTs = path.join(process.cwd(), 'node_modules', '.bin', isWin ? 'protoc-gen-ts_proto.cmd' : 'protoc-gen-ts_proto');

const protoDir = './investAPI-main/src/docs/contracts';
let protoFiles = [];
try {
  protoFiles = fs.readdirSync(protoDir)
    .filter(f => f.endsWith('.proto'))
    .map(f => path.join(protoDir, f));
} catch (e) {
  console.error(`Could not read proto directory ${protoDir}. Did you run pull-proto?`, e);
  process.exit(1);
}

const protoArgs = [
  `--plugin="protoc-gen-ts_proto=${protocGenTs}"`,
  `--ts_proto_out="${OUT_DIR}"`,
  `--ts_proto_opt="outputServices=nice-grpc"`,
  `--ts_proto_opt="outputServices=generic-definitions"`,
  `--ts_proto_opt="useExactTypes=false"`,
  `--ts_proto_opt="env=node"`,
  `--ts_proto_opt="esModuleInterop=true"`,
  `--ts_proto_opt="outputPartialMethods=false"`,
  `--ts_proto_opt="useOptionals=messages"`,
  `--proto_path="${protoDir}"`,
  `--proto_path="./protoc-dir/include"`,
  ...protoFiles.map(f => `"${f}"`)
].join(' ');

console.log('Compiling proto files...');
try {
  execSync(`protoc ${protoArgs}`, { stdio: 'inherit' });
} catch (e) {
  console.error("protoc failed. Ensure 'protoc' is in your PATH.", e.message);
  process.exit(1);
}

console.log('Fixing ESM imports...');
const fixEsmImports = (dir) => {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      fixEsmImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/import _m0 from "protobufjs\/minimal";/g, 'import _m0 from "protobufjs/minimal.js";');
      content = content.replace(/from "\.\/([^"]+)";/g, 'from "./$1.js";');
      fs.writeFileSync(fullPath, content);
    }
  }
};

fixEsmImports(OUT_DIR);
console.log('Done compiling proto files.');
