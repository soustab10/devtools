/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//
import {
  ScopeType,
  SourceLocation as ProtocolSourceLocation,
  loadedRegions,
} from "@replayio/protocol";
import {
  fetchEventTypePoints,
  setLogpoint,
  setLogpointByURL,
  newLogGroupId,
  setEventLogpoints,
  setExceptionLogpoint,
  removeLogpoint,
} from "ui/actions/logpoint";
import { ThreadFront, createPrimitiveValueFront, ValueFront } from "protocol/thread";
import { WiredNamedValue } from "protocol/thread/pause";

import { SelectedFrame } from "../reducers/pause";
import type { BreakpointOptions, SourceLocation } from "../reducers/types";

import { createFrame } from "./create";
import { MiniSource } from "ui/reducers/sources";

export type InitialBreakpointOptions = Pick<
  BreakpointOptions,
  "condition" | "shouldPause" | "logValue"
>;
type FinalBreakpointOptions = Pick<
  BreakpointOptions,
  "condition" | "shouldPause" | "logValue" | "logGroupId"
>;

interface BreakpointDetails {
  location: SourceLocation;
  options: FinalBreakpointOptions;
}

let currentThreadFront: any;
let currentTarget: any;
let breakpoints: Record<string, BreakpointDetails> = {};

function setupCommands() {
  breakpoints = {};
}

function resume(point: string, loadedRegions: loadedRegions) {
  return ThreadFront.resume(point, loadedRegions);
}

function stepIn(point: string, loadedRegions: loadedRegions) {
  return ThreadFront.stepIn(point, loadedRegions);
}

function stepOver(point: string, loadedRegions: loadedRegions) {
  return ThreadFront.stepOver(point, loadedRegions);
}

function stepOut(point: string, loadedRegions: loadedRegions) {
  return ThreadFront.stepOut(point, loadedRegions);
}

function rewind(point: string, loadedRegions: loadedRegions) {
  return ThreadFront.rewind(point, loadedRegions);
}

function reverseStepOver(point: string, loadedRegions: loadedRegions) {
  return ThreadFront.reverseStepOver(point, loadedRegions);
}

// Get the string key to use for a breakpoint location.
// See also duplicate code in breakpoint-actor-map.js :(
function locationKey(location: SourceLocation) {
  const { sourceUrl, line, column } = location;
  const sourceId = location.sourceId || "";
  // $FlowIgnore
  return `${sourceUrl}:${sourceId}:${line}:${column}`;
}

function maybeGenerateLogGroupId(options: InitialBreakpointOptions): FinalBreakpointOptions {
  if (options.logValue) {
    return { ...options, logGroupId: newLogGroupId() };
  }
  return options;
}

async function maybeClearLogpoint(location: SourceLocation) {
  const bp = breakpoints[locationKey(location)];
  if (bp && bp.options.logGroupId) {
    removeLogpoint(bp.options.logGroupId);
  }
}

function hasBreakpoint(location: SourceLocation) {
  return !!breakpoints[locationKey(location)];
}

function setBreakpoint(location: SourceLocation, options: InitialBreakpointOptions) {
  maybeClearLogpoint(location);
  const finalOptions = maybeGenerateLogGroupId(options);
  breakpoints[locationKey(location)] = { location, options: finalOptions };

  const { condition, logValue, logGroupId, shouldPause } = finalOptions;
  const { line, column, sourceUrl, sourceId } = location;
  const promises = [];

  if (sourceId) {
    if (shouldPause) {
      promises.push(ThreadFront.setBreakpoint(sourceId, line, column!, condition!));
    }
    if (logValue) {
      promises.push(
        setLogpoint(logGroupId!, { sourceId, line, column: column! }, logValue, condition!)
      );
    }
  } else {
    if (shouldPause) {
      promises.push(ThreadFront.setBreakpointByURL(sourceUrl!, line, column!, condition!));
    }
    if (logValue) {
      promises.push(setLogpointByURL(logGroupId!, sourceUrl!, line, column!, logValue, condition!));
    }
  }

  return Promise.all(promises);
}

function removeBreakpoint(location: SourceLocation) {
  maybeClearLogpoint(location);
  delete breakpoints[locationKey(location)];

  const { line, column, sourceUrl, sourceId } = location;
  if (sourceId) {
    return ThreadFront.removeBreakpoint(sourceId, line, column!);
  }
  return ThreadFront.removeBreakpointByURL(sourceUrl!, line, column!);
}

function runAnalysis(location: SourceLocation, options: InitialBreakpointOptions) {
  const finalOptions = maybeGenerateLogGroupId(options);
  const { condition, logValue, logGroupId } = finalOptions;
  const { line, column, sourceUrl, sourceId } = location;

  if (sourceId) {
    setLogpoint(logGroupId!, { sourceId, line, column: column! }, logValue!, condition!);
  } else {
    setLogpointByURL(logGroupId!, sourceUrl!, line, column!, logValue!, condition!);
  }
}

export interface EvaluateOptions {
  asyncIndex?: number;
  frameId?: string;
}

async function evaluate(source: string, { asyncIndex, frameId }: EvaluateOptions = {}) {
  const { returned, exception, failed } = await ThreadFront.evaluate({
    asyncIndex,
    frameId,
    text: source,
  });
  if (failed) {
    return { exception: createPrimitiveValueFront("Evaluation failed") };
  }
  if (returned) {
    return { result: returned };
  }
  return { exception };
}

async function autocomplete(input: any, cursor: any, frameId: any) {
  if (!currentTarget || !input) {
    return {};
  }
  const consoleFront = await currentTarget.getFront("console");
  if (!consoleFront) {
    return {};
  }

  return new Promise(resolve => {
    consoleFront.autocomplete(input, cursor, (result: any) => resolve(result), frameId);
  });
}

async function getFrames() {
  const frames = (await ThreadFront.getFrames()) ?? [];
  return Promise.all(frames.map((frame, i) => createFrame(frame, i)));
}

async function loadAsyncParentFrames(asyncIndex?: number) {
  const frames = await ThreadFront.loadAsyncParentFrames();
  return Promise.all(frames.map((frame, i) => createFrame(frame, i, asyncIndex)));
}

// Isn't this a lovely type lookup?
type ProtocolScope = Awaited<ReturnType<typeof ThreadFront["getScopes"]>>["scopes"][number];

interface ConvertedScope {
  actor: string;
  parent: ConvertedScope | null;
  bindings: WiredNamedValue[] | undefined;
  object: ValueFront | undefined;
  functionName: string | undefined;
  type: ScopeType;
  scopeKind: string;
}

function convertScope(protocolScope: ProtocolScope): ConvertedScope {
  const { scopeId, type, functionLexical, object, functionName, bindings } = protocolScope;

  return {
    actor: scopeId,
    parent: null,
    bindings,
    object,
    functionName,
    type,
    scopeKind: functionLexical ? "function lexical" : "",
  };
}

async function getFrameScopes(frame: SelectedFrame) {
  const { scopes, originalScopesUnavailable } = await ThreadFront.getScopes(
    frame.asyncIndex,
    frame.protocolId
  );
  const converted = scopes.map(convertScope);
  for (let i = 0; i + 1 < converted.length; i++) {
    converted[i].parent = converted[i + 1];
  }
  return { scopes: converted[0], originalScopesUnavailable };
}

export interface SourceRange {
  start: ProtocolSourceLocation;
  end: ProtocolSourceLocation;
}

async function blackBox(source: MiniSource, isBlackBoxed: boolean, range?: Partial<SourceRange>) {
  // TODO Re-enable blackboxing
  /*
  const begin = range ? range.start : undefined;
  const end = range ? range.end : undefined;
  if (isBlackBoxed) {
    await ThreadFront.unblackbox(source.id, begin, end);
  } else {
    await ThreadFront.blackbox(source.id, begin, end);
  }
  */
}

let gExceptionLogpointGroupId: string | null;

function logExceptions(shouldLog: boolean) {
  if (gExceptionLogpointGroupId) {
    removeLogpoint(gExceptionLogpointGroupId);
  }
  if (shouldLog) {
    gExceptionLogpointGroupId = newLogGroupId();
    setExceptionLogpoint(gExceptionLogpointGroupId);
  } else {
    gExceptionLogpointGroupId = null;
  }
}

export function prepareSourcePayload(source: {
  sourceId: string;
  url?: string;
  sourceMapURL?: string;
}) {
  return { thread: ThreadFront.actor, source };
}

async function getSources(client: any) {
  const { sources } = await client.getSources();

  return sources.map((source: any) => prepareSourcePayload(source));
}

// Fetch the sources for all the targets
async function fetchSources() {
  let sources = await getSources(ThreadFront);

  return sources;
}

function fetchAncestorFramePositions(asyncIndex: number, frameId: string) {
  return ThreadFront.getFrameSteps(asyncIndex, frameId);
}

const clientCommands = {
  autocomplete,
  blackBox,
  resume,
  stepIn,
  stepOut,
  stepOver,
  rewind,
  reverseStepOver,
  hasBreakpoint,
  setBreakpoint,
  removeBreakpoint,
  runAnalysis,
  evaluate,
  getFrameScopes,
  getFrames,
  loadAsyncParentFrames,
  logExceptions,
  fetchSources,
  fetchEventTypePoints,
  fetchAncestorFramePositions,
};

export { setupCommands, clientCommands };
