type BuildRoundShellCommandInput = {
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  outputFile: string;
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
    `echo "$ ${codexCommand}"`,
    `${codexCommand} 2>&1 | tee ${shellQuote(input.outputFile)}`,
    'exit ${PIPESTATUS[0]}',
  ].join('; ');
}
