'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, FolderOpen, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

export interface SourceSettings {
  googleConnected: boolean
  googleEmail: string | null
  gmailEnabled: boolean
  gmailPollingInterval: string
  driveEnabled: boolean
  driveFolderId: string | null
}

interface SourceSettingsClientProps {
  settings: SourceSettings
}

export function SourceSettingsClient({ settings }: SourceSettingsClientProps) {
  const [gmailEnabled, setGmailEnabled] = useState(settings.gmailEnabled)
  const [pollingInterval, setPollingInterval] = useState(settings.gmailPollingInterval)
  const [driveEnabled, setDriveEnabled] = useState(settings.driveEnabled)
  const [driveFolderId, setDriveFolderId] = useState(settings.driveFolderId ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async (overrides?: Partial<{ gmailEnabled: boolean; driveEnabled: boolean }>) => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmailEnabled: overrides?.gmailEnabled ?? gmailEnabled,
          driveEnabled: overrides?.driveEnabled ?? driveEnabled,
          driveFolderId: driveFolderId || null,
          pollingInterval,
        }),
      })
      if (res.ok) setSaveSuccess(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGmailToggle = async (checked: boolean) => {
    setGmailEnabled(checked)
    await handleSave({ gmailEnabled: checked })
  }

  const handleDriveToggle = async (checked: boolean) => {
    setDriveEnabled(checked)
    await handleSave({ driveEnabled: checked })
  }

  const handleDisconnect = async () => {
    await fetch('/api/auth/google', { method: 'DELETE' })
    window.location.reload()
  }

  const ConnectionStatus = () =>
    settings.googleConnected ? (
      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700">Verbunden</p>
            <p className="text-xs text-slate-500">{settings.googleEmail}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Trennen
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700">Nicht verbunden</p>
            <p className="text-xs text-slate-500">
              Google-Konto verbinden, um diese Quelle zu aktivieren
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
          <a href="/api/auth/google">
            Google verbinden
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
      </div>
    )

  return (
    <Tabs defaultValue="gmail">
      <TabsList className="mb-6">
        <TabsTrigger value="gmail" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Gmail
        </TabsTrigger>
        <TabsTrigger value="drive" className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Google Drive
        </TabsTrigger>
      </TabsList>

      {/* Gmail Tab */}
      <TabsContent value="gmail">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" />
              Gmail-Integration
            </CardTitle>
            <CardDescription>
              E-Mails mit PDF-Anhang werden automatisch abgerufen und mit dem Label „Verarbeitet"
              versehen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ConnectionStatus />

            {settings.googleConnected && (
              <>
                <Separator />

                {/* Gmail aktivieren Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Gmail-Abruf aktiviert</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Schaltet den automatischen Abruf ein oder aus
                    </p>
                  </div>
                  <Switch
                    checked={gmailEnabled}
                    onCheckedChange={handleGmailToggle}
                    aria-label="Gmail-Abruf aktivieren"
                  />
                </div>

                {gmailEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Abruf-Intervall</Label>
                      <Select value={pollingInterval} onValueChange={setPollingInterval}>
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">Alle 15 Minuten</SelectItem>
                          <SelectItem value="30">Alle 30 Minuten</SelectItem>
                          <SelectItem value="60">Stündlich</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Nur E-Mails mit PDF-Anhang werden verarbeitet.
                      </p>
                    </div>

                    {saveSuccess && (
                      <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-700">
                          Einstellungen gespeichert.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isSaving ? 'Wird gespeichert…' : 'Einstellungen speichern'}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Google Drive Tab */}
      <TabsContent value="drive">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-500" />
              Google Drive-Integration
            </CardTitle>
            <CardDescription>
              Neue PDFs in einem konfigurierten Ordner werden automatisch erkannt und verarbeitet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ConnectionStatus />

            {!settings.googleConnected && (
              <p className="text-xs text-slate-500">
                Gmail und Google Drive nutzen dieselbe Google-Verbindung — einmal verbinden,
                beide aktiv.
              </p>
            )}

            {settings.googleConnected && (
              <>
                <Separator />

                {/* Drive aktivieren Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Drive-Überwachung aktiviert</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Schaltet die automatische Ordner-Überwachung ein oder aus
                    </p>
                  </div>
                  <Switch
                    checked={driveEnabled}
                    onCheckedChange={handleDriveToggle}
                    aria-label="Drive-Überwachung aktivieren"
                  />
                </div>

                {driveEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="folder-id">Eingangsordner-ID</Label>
                      <Input
                        id="folder-id"
                        placeholder="z.B. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                        value={driveFolderId}
                        onChange={(e) => setDriveFolderId(e.target.value)}
                      />
                      <p className="text-xs text-slate-500">
                        Die Ordner-ID steht in der Google Drive URL:{' '}
                        <span className="font-mono">
                          drive.google.com/drive/folders/<strong>ID</strong>
                        </span>
                      </p>
                    </div>

                    {saveSuccess && (
                      <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-700">
                          Einstellungen gespeichert.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isSaving ? 'Wird gespeichert…' : 'Einstellungen speichern'}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
