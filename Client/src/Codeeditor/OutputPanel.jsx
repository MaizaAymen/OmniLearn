import { TerminalIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

function OutputPanel({ output }) {
  return (
    <div className="h-full bg-base-100 flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {output === null ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/30">
            <TerminalIcon className="size-8 mb-2" />
            <p className="text-xs font-medium">
              Run your code to see the output here
            </p>
          </div>
        ) : output.success ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-success text-xs font-semibold">
              <CheckCircle2Icon className="size-3.5" />
              Executed Successfully
            </div>
            <pre className="text-sm font-mono text-base-content whitespace-pre-wrap bg-base-200/50 rounded-lg p-3 border border-base-300">
              {output.output}
            </pre>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-error text-xs font-semibold">
              <XCircleIcon className="size-3.5" />
              Execution Failed
            </div>
            {output.output && (
              <pre className="text-sm font-mono text-base-content whitespace-pre-wrap bg-base-200/50 rounded-lg p-3 border border-base-300 mb-2">
                {output.output}
              </pre>
            )}
            <pre className="text-sm font-mono text-error whitespace-pre-wrap bg-error/5 rounded-lg p-3 border border-error/20">
              {output.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
export default OutputPanel;