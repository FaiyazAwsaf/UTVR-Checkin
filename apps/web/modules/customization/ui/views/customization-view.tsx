"use client";

import { useOrganization } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CheckIcon,
  Code2Icon,
  CopyIcon,
  DatabaseZapIcon,
  ImageIcon,
  PaletteIcon,
  SaveIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { brand } from "@workspace/ui/brand";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { DEMO_KNOWLEDGE_BASE_BN } from "../../data/demo-knowledge-base";

interface CustomizationForm {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  greeting: string;
  assistantName: string;
  suggestions: string;
  showAttribution: boolean;
}

const defaultForm: CustomizationForm = {
  brandName: brand.name,
  logoUrl: brand.logo,
  primaryColor: brand.colors.primary,
  greeting: brand.greeting,
  assistantName: brand.assistantName,
  suggestions: "",
  showAttribution: false,
};

export const CustomizationView = () => {
  const { organization } = useOrganization();
  const settings = useQuery(api.private.widgetSettings.get);
  const saveSettings = useMutation(api.private.widgetSettings.upsert);
  const addFile = useAction(api.private.files.addFile);
  const [form, setForm] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (settings === undefined) {
      return;
    }

    if (settings === null) {
      setForm(defaultForm);
      return;
    }

    setForm({
      brandName: settings.brandName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      greeting: settings.greeting,
      assistantName: settings.assistantName,
      suggestions: settings.suggestions.join("\n"),
      showAttribution: settings.showAttribution,
    });
  }, [settings]);

  const updateField = <K extends keyof CustomizationForm>(
    field: K,
    value: CustomizationForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!/^#[0-9a-f]{6}$/i.test(form.primaryColor)) {
      toast.error("Use a six-digit hex color, such as #2563eb");
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings({
        brandName: form.brandName,
        logoUrl: form.logoUrl,
        primaryColor: form.primaryColor,
        greeting: form.greeting,
        assistantName: form.assistantName,
        suggestions: form.suggestions.split("\n"),
        showAttribution: form.showAttribution,
      });
      toast.success("Widget branding saved");
    } catch {
      toast.error("Unable to save widget branding");
    } finally {
      setIsSaving(false);
    }
  };

  const widgetUrl = `${process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:3001"}/?organizationId=${organization?.id || "your-organization-id"}`;
  const embedCode = `<iframe\n  src="${widgetUrl}"\n  title="${form.brandName || "Customer support"}"\n  width="430"\n  height="700"\n  style="border: 0; border-radius: 20px;"\n></iframe>`;

  const copyEmbedCode = async () => {
    await navigator.clipboard.writeText(embedCode);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  };

  const loadDemoKnowledge = async () => {
    setIsSeeding(true);
    try {
      await addFile({
        bytes: await new Blob([DEMO_KNOWLEDGE_BASE_BN], {
          type: "text/plain",
        }).arrayBuffer(),
        category: "Demo",
        filename: "demo-support-bangla.txt",
        mimeType: "text/plain",
      });
      toast.success("Bengali demo knowledge loaded");
    } catch {
      toast.error("Unable to load demo knowledge");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-full bg-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-primary">Customer widget</p>
          <h1 className="text-3xl font-semibold tracking-tight">Make it yours</h1>
          <p className="text-muted-foreground">
            Shape the support experience your customers see. Changes apply to
            this organization&apos;s widget without changing the operator dashboard.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Widget identity</CardTitle>
              <CardDescription>
                These details are loaded by the widget at boot for this organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand name</Label>
                  <Input
                    id="brandName"
                    onChange={(event) => updateField("brandName", event.target.value)}
                    placeholder="Acme"
                    value={form.brandName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assistantName">Assistant name</Label>
                  <Input
                    id="assistantName"
                    onChange={(event) => updateField("assistantName", event.target.value)}
                    placeholder="Riley"
                    value={form.assistantName}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <div className="relative">
                  <ImageIcon className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    id="logoUrl"
                    onChange={(event) => updateField("logoUrl", event.target.value)}
                    placeholder="https://example.com/logo.svg"
                    value={form.logoUrl}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use a relative path on the widget host or an HTTPS image URL.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting</Label>
                <Textarea
                  id="greeting"
                  onChange={(event) => updateField("greeting", event.target.value)}
                  placeholder="হ্যালো! আমি UVTR Checkin থেকে বলছি। কীভাবে আপনাকে সাহায্য করতে পারি?"
                  rows={3}
                  value={form.greeting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suggestions">Conversation starters</Label>
                <Textarea
                  id="suggestions"
                  onChange={(event) => updateField("suggestions", event.target.value)}
                  placeholder={"How can you help?\nWhere can I find my order?"}
                  rows={3}
                  value={form.suggestions}
                />
                <p className="text-xs text-muted-foreground">
                  One suggestion per line. Keep up to four concise prompts.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <Label htmlFor="showAttribution">Show attribution</Label>
                  <p className="text-xs text-muted-foreground">
                    Add a small &quot;Powered by {brand.name}&quot; line to the widget.
                  </p>
                </div>
                <Switch
                  checked={form.showAttribution}
                  id="showAttribution"
                  onCheckedChange={(checked) => updateField("showAttribution", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary color</Label>
                <div className="flex gap-2">
                  <Input
                    aria-label="Choose primary color"
                    className="h-10 w-14 cursor-pointer p-1"
                    onChange={(event) => updateField("primaryColor", event.target.value)}
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(form.primaryColor) ? form.primaryColor : "#2563eb"}
                  />
                  <div className="relative flex-1">
                    <PaletteIcon className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9 uppercase"
                      id="primaryColor"
                      maxLength={7}
                      onChange={(event) => updateField("primaryColor", event.target.value)}
                      placeholder="#2563EB"
                      value={form.primaryColor}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t">
              <Button disabled={isSaving || settings === undefined} onClick={() => void handleSave()}>
                <SaveIcon />
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>A quiet check before you publish.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="mx-auto max-w-[300px] py-8">
                  <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                    <div
                      className="p-5 text-primary-foreground"
                      style={{ backgroundColor: form.primaryColor }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          alt=""
                          className="size-9 rounded-lg bg-white object-contain p-1"
                          src={form.logoUrl || brand.logo}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{form.brandName || "Your brand"}</p>
                          <p className="text-xs text-primary-foreground/75">Support</p>
                        </div>
                      </div>
                      <p className="mt-8 text-xl font-semibold">{form.greeting || "Your greeting"}</p>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="h-3 w-4/5 rounded bg-muted" />
                      <div className="h-3 w-3/5 rounded bg-muted" />
                      <div className="mt-6 h-9 rounded-lg border bg-muted/30" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code2Icon className="size-4" />
                  Embed code
                </CardTitle>
                <CardDescription>Place this iframe where support should appear.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea className="font-mono text-xs" readOnly rows={7} value={embedCode} />
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={() => void copyEmbedCode()} size="sm" variant="outline">
                  {isCopied ? <CheckIcon /> : <CopyIcon />}
                  {isCopied ? "Copied" : "Copy code"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DatabaseZapIcon className="size-4" />
                  Test knowledge
                </CardTitle>
                <CardDescription>
                  Load a clearly marked fictional Bengali support document to test search and replies.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-end">
                <Button
                  disabled={isSeeding}
                  onClick={() => void loadDemoKnowledge()}
                  size="sm"
                  variant="outline"
                >
                  {isSeeding ? "Loading..." : "Load sample data"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
