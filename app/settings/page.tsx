"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { KeyRound, User, Building2, MapPin, Save, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiSettingsGet, apiSettingsSet } from "@/lib/api";

interface SettingsData {
  google_places_api_key: string | null;
  sender_name: string | null;
  studio_name: string | null;
  default_location: string | null;
}
interface EnvFlags { has_env_key: boolean; enable_playwright: boolean; }

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData>({
    google_places_api_key: "",
    sender_name: "",
    studio_name: "",
    default_location: "",
  });
  const [env, setEnv] = useState<EnvFlags>({ has_env_key: false, enable_playwright: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyDirty, setKeyDirty] = useState(false);

  useEffect(() => {
    const d = apiSettingsGet();
    setData({
      google_places_api_key: d.settings.google_places_api_key ?? "",
      sender_name: d.settings.sender_name ?? "",
      studio_name: d.settings.studio_name ?? "",
      default_location: d.settings.default_location ?? "",
    });
    setEnv(d.env);
    setLoading(false);
  }, []);

  function save() {
    setSaving(true);
    const payload: any = {
      sender_name: data.sender_name ?? "",
      studio_name: data.studio_name ?? "",
      default_location: data.default_location ?? "",
    };
    apiSettingsSet(payload);
    setSaving(false);
    toast.success("Settings saved");
    setKeyDirty(false);
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Settings"
        title="API keys & studio profile."
        description="Personalise the outreach generator. Search is free — powered by OpenStreetMap, no API key needed."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 ring-frame">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-violet-300" /> Search source · OpenStreetMap (free)</CardTitle>
            <CardDescription>Lead Search uses the public <a className="text-violet-300 hover:underline" target="_blank" rel="noreferrer noopener" href="https://wiki.openstreetmap.org/wiki/Overpass_API">Overpass API</a>. No key, no billing, no signup. Be a good neighbour: a few searches per minute, not hundreds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success">No API key required</Badge>
              <Badge variant="info">Public OSM data</Badge>
              {env.enable_playwright && <Badge variant="info">Playwright enabled</Badge>}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground space-y-1">
              <div className="text-foreground inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Public data only</div>
              The app reads publicly available business listings on OpenStreetMap and renders publicly accessible web pages. It does not log into any platform, bypass paywalls, or collect private personal data. Owner names should only be added if clearly public (e.g. listed on a website's About page).
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground space-y-1">
              <div className="text-foreground">Optional — point to a different Overpass mirror</div>
              Set <code className="text-foreground/90">OVERPASS_URL</code> in <code className="text-foreground/90">.env.local</code> if the default is rate-limited. Examples:
              <ul className="mt-1 ml-4 list-disc">
                <li><code>https://overpass-api.de/api/interpreter</code> (default)</li>
                <li><code>https://overpass.kumi.systems/api/interpreter</code></li>
                <li><code>https://overpass.private.coffee/api/interpreter</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outreach voice</CardTitle>
            <CardDescription>How messages will be signed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-2"><User className="h-3 w-3" /> Your name</Label>
              <Input value={data.sender_name ?? ""} onChange={(e) => setData((s) => ({ ...s, sender_name: e.target.value }))} placeholder="Eren" />
            </div>
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-2"><Building2 className="h-3 w-3" /> Studio name</Label>
              <Input value={data.studio_name ?? ""} onChange={(e) => setData((s) => ({ ...s, studio_name: e.target.value }))} placeholder="e.g. Starboard Studio" />
            </div>
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-2"><MapPin className="h-3 w-3" /> Default location bias</Label>
              <Input value={data.default_location ?? ""} onChange={(e) => setData((s) => ({ ...s, default_location: e.target.value }))} placeholder="Sliema" />
            </div>
          </CardContent>
        </Card>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-end"
      >
        <Button onClick={save} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Optional: Playwright deep checks</CardTitle>
          <CardDescription>Slower but more accurate — confirms mobile-friendliness and render time.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>1. <code className="text-foreground/90">npm i -D playwright</code></div>
          <div>2. <code className="text-foreground/90">npx playwright install chromium</code></div>
          <div>3. Add <code className="text-foreground/90">ENABLE_PLAYWRIGHT=true</code> to <code className="text-foreground/90">.env.local</code> and restart.</div>
          <div className="pt-1">When enabled, the lead detail page's "Deep check" button uses a real browser render.</div>
        </CardContent>
      </Card>
    </PageTransition>
  );
}
