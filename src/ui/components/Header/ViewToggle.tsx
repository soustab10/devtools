import React from "react";
import { useAppDispatch, useAppSelector } from "ui/setup/hooks";
import classnames from "classnames";
import { isTest } from "ui/utils/environment";
import hooks from "ui/hooks";
import { setViewMode } from "ui/actions/layout";
import { ViewMode } from "ui/state/layout";
import { getViewMode } from "ui/reducers/layout";
import { Nag } from "ui/hooks/users";
import { shouldShowNag } from "ui/utils/user";

const MODES = [
  {
    mode: "non-dev",
    label: "Viewer",
  },
  {
    mode: "dev",
    label: "DevTools",
  },
] as const;

export default function ViewToggle() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(getViewMode);
  const recordingId = hooks.useGetRecordingId();
  const { recording, loading } = hooks.useGetRecording(recordingId);
  const { userId } = hooks.useGetUserId();
  const isAuthor = userId && userId == recording?.userId;
  const dismissNag = hooks.useDismissNag();
  const { nags } = hooks.useGetUserInfo();

  const handleToggle = async (mode: ViewMode) => {
    dispatch(setViewMode(mode));

    // if (mode === "dev") {
    //   dismissNag(Nag.VIEW_DEVTOOLS);
    // }
  };

  const shouldHide = isAuthor && !recording?.isInitialized && !isTest();

  if (loading || shouldHide) {
    return null;
  }

  return (
    <div className="flex">
      {shouldShowNag(nags, Nag.VIEW_DEVTOOLS) && (
        <div className=" mr-2 flex items-center space-x-1.5 rounded-lg bg-primaryAccent pl-2 pr-2 text-sm text-buttontextColor hover:bg-primaryAccentHover focus:outline-none focus:ring-2 focus:ring-primaryAccent focus:ring-offset-2">
          Check out DevTools!
        </div>
      )}
      <div className="view-toggle" role="button">
        <div
          className="handle"
          style={{
            left: `${(MODES.findIndex(({ mode }) => mode === viewMode) / MODES.length) * 100}%`,
          }}
        ></div>
        {MODES.map(({ mode, label }) => (
          <div key={mode} className="option" onClick={() => handleToggle(mode)}>
            <div className={classnames("text", { active: viewMode === mode })}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
