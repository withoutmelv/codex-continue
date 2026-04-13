import os from 'node:os';
import { LinuxTerminalAdapter } from './linuxTerminalAdapter';
import { MacOsTerminalAdapter } from './macosTerminalAdapter';
import { WindowsTerminalAdapter } from './windowsTerminalAdapter';

export function createTerminalAdapter() {
  switch (os.platform()) {
    case 'darwin':
      return new MacOsTerminalAdapter();
    case 'win32':
      return new WindowsTerminalAdapter();
    default:
      return new LinuxTerminalAdapter();
  }
}
