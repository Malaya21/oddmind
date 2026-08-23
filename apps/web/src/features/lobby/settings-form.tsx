"use client";

import type { RoomSettings } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoomSettingsFieldsProps {
  settings: RoomSettings;
  disabled?: boolean;
  onChange: (settings: RoomSettings) => void;
}

function updateNumber(
  settings: RoomSettings,
  key: keyof Pick<
    RoomSettings,
    | "minPlayers"
    | "maxPlayers"
    | "rounds"
    | "clueDurationSec"
    | "discussionDurationSec"
    | "votingDurationSec"
  >,
  value: string,
): RoomSettings {
  return {
    ...settings,
    [key]: Number(value),
  };
}

export function RoomSettingsFields({
  settings,
  disabled,
  onChange,
}: RoomSettingsFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="minPlayers">Minimum players</Label>
        <Input
          id="minPlayers"
          type="number"
          min={4}
          max={12}
          value={settings.minPlayers}
          disabled={disabled}
          onChange={(event) =>
            onChange(updateNumber(settings, "minPlayers", event.target.value))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxPlayers">Maximum players</Label>
        <Input
          id="maxPlayers"
          type="number"
          min={4}
          max={12}
          value={settings.maxPlayers}
          disabled={disabled}
          onChange={(event) =>
            onChange(updateNumber(settings, "maxPlayers", event.target.value))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rounds">Rounds</Label>
        <Input
          id="rounds"
          type="number"
          min={3}
          max={10}
          value={settings.rounds}
          disabled={disabled}
          onChange={(event) =>
            onChange(updateNumber(settings, "rounds", event.target.value))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="oddPlayerMode">Odd players</Label>
        <select
          id="oddPlayerMode"
          value={settings.oddPlayerMode}
          disabled={disabled}
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
          onChange={(event) =>
            onChange({
              ...settings,
              oddPlayerMode: event.target.value as RoomSettings["oddPlayerMode"],
            })
          }
        >
          <option value="AUTOMATIC">Automatic</option>
          <option value="ONE">1</option>
          <option value="TWO">2</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="clueDurationSec">Clue time</Label>
        <Input
          id="clueDurationSec"
          type="number"
          min={30}
          max={120}
          value={settings.clueDurationSec}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              updateNumber(settings, "clueDurationSec", event.target.value),
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="discussionDurationSec">Discussion time</Label>
        <Input
          id="discussionDurationSec"
          type="number"
          min={30}
          max={120}
          value={settings.discussionDurationSec}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              updateNumber(
                settings,
                "discussionDurationSec",
                event.target.value,
              ),
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="votingDurationSec">Voting time</Label>
        <Input
          id="votingDurationSec"
          type="number"
          min={15}
          max={30}
          value={settings.votingDurationSec}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              updateNumber(settings, "votingDurationSec", event.target.value),
            )
          }
        />
      </div>
    </div>
  );
}

export function oddPlayerModeLabel(mode: RoomSettings["oddPlayerMode"]): string {
  if (mode === "ONE") {
    return "1";
  }
  if (mode === "TWO") {
    return "2";
  }
  return "Automatic";
}
