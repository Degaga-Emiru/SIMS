"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Upload, Pencil, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/types";
import type { Role } from "@/app/generated/prisma/enums";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface Profile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  image: string | null;
  lastLogin: string | null;
  createdAt: string;
}

interface CompanySettings {
  companyName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  currencySymbol: string;
  currencyCode: string;
  decimalPlaces: number;
  taxRate: string;
  taxName: string;
  taxNumber: string | null;
  fiscalYearStart: string;
  theme: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    image: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    address: "",
    currency: "USD",
    currencySymbol: "$",
    currencyCode: "USD",
    decimalPlaces: 2,
    taxRate: 0,
    taxName: "VAT",
    taxNumber: "",
    fiscalYearStart: "01-01",
    theme: "light",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Profile }>("/settings/profile"),
      api.get<{ data: CompanySettings }>("/settings"),
    ]).then(([profileRes, settingsRes]) => {
      const p = profileRes.data.data;
      setProfile(p);
      setProfileForm((f) => ({ ...f, name: p.name, phone: p.phone ?? "", image: p.image ?? "" }));

      if (isSuperAdmin && settingsRes.data.data.companyName) {
        const s = settingsRes.data.data as CompanySettings;
        setCompanyForm({
          companyName: s.companyName ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          currency: s.currency ?? "USD",
          currencySymbol: s.currencySymbol ?? "$",
          currencyCode: s.currencyCode ?? "USD",
          decimalPlaces: s.decimalPlaces ?? 2,
          taxRate: Number(s.taxRate ?? 0),
          taxName: s.taxName ?? "VAT",
          taxNumber: s.taxNumber ?? "",
          fiscalYearStart: s.fiscalYearStart ?? "01-01",
          theme: s.theme ?? "light",
        });
      } else if (settingsRes.data.data.theme) {
        setCompanyForm((f) => ({ ...f, theme: settingsRes.data.data.theme }));
      }
      setLoading(false);
    });
  }, [isSuperAdmin]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post<{ data: { url: string } }>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfileForm((f) => ({ ...f, image: res.data.data.url }));
      toast.success("Photo uploaded — click Update Profile to save");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleProfileSave() {
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      return toast.error("Passwords don't match");
    }
    setSaving(true);
    try {
      const res = await api.put<{ data: Profile }>("/settings/profile", {
        name: profileForm.name,
        phone: profileForm.phone,
        image: profileForm.image,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined,
        confirmPassword: profileForm.confirmPassword || undefined,
      });
      setProfile(res.data.data);
      setEditing(false);
      setProfileForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleCompanySave() {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      await api.put("/settings", companyForm);
      setTheme(companyForm.theme === "system" ? "system" : companyForm.theme);
      toast.success("Company settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeSave() {
    setTheme(companyForm.theme === "system" ? "system" : companyForm.theme);
    toast.success("Theme updated");
  }

  if (loading) return <p className="text-muted-foreground">Loading settings...</p>;

  const initials = profile?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile and preferences" />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="company">Company</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="taxes">Taxes & Currency</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                Profile
                {profile && <Badge>{ROLE_LABELS[profile.role]}</Badge>}
              </CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  {(profileForm.image || profile?.image) && (
                    <AvatarImage src={profileForm.image || profile?.image || ""} />
                  )}
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                {editing && (
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span><Upload className="h-4 w-4 mr-1" /> Upload Photo</span>
                    </Button>
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={editing ? profileForm.name : profile?.name ?? ""} disabled={!editing}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Email <Lock className="h-3 w-3 text-muted-foreground" /></Label>
                  <Input value={profile?.email ?? ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editing ? profileForm.phone : profile?.phone ?? "—"} disabled={!editing}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Employee ID</Label>
                  <Input value={profile?.employeeId ?? ""} disabled className="bg-muted font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={profile?.department ?? "—"} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input value={profile?.position ?? "—"} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Date Joined</Label>
                  <Input value={profile ? formatDate(profile.createdAt) : ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Last Login</Label>
                  <Input value={profile?.lastLogin ? formatDate(profile.lastLogin) : "Never"} disabled className="bg-muted" />
                </div>
              </div>

              {editing && (
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium">Change Password (optional)</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input type="password" value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleProfileSave} disabled={saving}>
                      {saving ? "Saving..." : "Update Profile"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-4">
          <Card className="max-w-md">
            <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={companyForm.theme} onValueChange={(v) => setCompanyForm({ ...companyForm, theme: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleThemeSave}>Apply Theme</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <>
            <TabsContent value="company" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Company Name</Label>
                    <Input value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Email</Label>
                    <Input value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Phone</Label>
                    <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taxes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Taxes & Currency</CardTitle>
                  <p className="text-sm text-muted-foreground">Super Admin only — affects all invoices and sales calculations</p>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Currency Code</Label>
                    <Select value={companyForm.currencyCode} onValueChange={(v) => {
                      const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", KES: "KSh" };
                      setCompanyForm({ ...companyForm, currencyCode: v, currency: v, currencySymbol: symbols[v] ?? v });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound</SelectItem>
                        <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency Symbol</Label>
                    <Input value={companyForm.currencySymbol} onChange={(e) => setCompanyForm({ ...companyForm, currencySymbol: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Decimal Places</Label>
                    <Input type="number" min={0} max={4} value={companyForm.decimalPlaces}
                      onChange={(e) => setCompanyForm({ ...companyForm, decimalPlaces: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Name</Label>
                    <Input value={companyForm.taxName} onChange={(e) => setCompanyForm({ ...companyForm, taxName: e.target.value })} placeholder="VAT, GST, Sales Tax" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input type="number" min={0} max={100} step={0.01} value={companyForm.taxRate}
                      onChange={(e) => setCompanyForm({ ...companyForm, taxRate: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Registration Number</Label>
                    <Input value={companyForm.taxNumber} onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year Start (MM-DD)</Label>
                    <Input value={companyForm.fiscalYearStart} onChange={(e) => setCompanyForm({ ...companyForm, fiscalYearStart: e.target.value })} placeholder="01-01" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <Button onClick={handleCompanySave} disabled={saving} className="mt-4">
              {saving ? "Saving..." : "Save Company Settings"}
            </Button>
          </>
        )}
      </Tabs>
    </div>
  );
}
