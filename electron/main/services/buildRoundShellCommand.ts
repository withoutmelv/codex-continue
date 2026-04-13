type BuildRoundShellCommandInput = {
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  outputFile: string;
  exitCodeFile: string;
  doneFile: string;
  pidFile: string;
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildRoundShellCommand(input: BuildRoundShellCommandInput) {
  const codexCommand = [
    'codex',
    'exec',
    'resume',
    shellQuote(input.sessionId),
    shellQuote(input.fixedPrompt),
    '--json',
    '--skip-git-repo-check',
  ].join(' ');

  return [
    `cd ${shellQuote(input.cwd)}`,
    `rm -f ${shellQuote(input.outputFile)} ${shellQuote(input.exitCodeFile)} ${shellQuote(input.doneFile)} ${shellQuote(input.pidFile)}`,
    `exec > >(tee ${shellQuote(input.outputFile)}) 2>&1`,
    `echo "$ ${codexCommand}"`,
    `${codexCommand} &`,
    'pid=$!',
    `echo "$pid" > ${shellQuote(input.pidFile)}`,
    'wait "$pid"',
    'code=$?',
    `printf '%s' "$code" > ${shellQuote(input.exitCodeFile)}`,
    `touch ${shellQuote(input.doneFile)}`,
  ].join('; ');
}
