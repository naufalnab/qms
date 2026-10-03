'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const validRoles = ['admin', 'qms', 'qms_section_head', 'qmsr'] as const;
type ManagedRole = typeof validRoles[number];
type ManagedUser = { id: string; email: string; full_name: string; role: ManagedRole; is_active: boolean; invited: boolean };
type ActionResult = { error?: string; message?: string; users?: ManagedUser[] };

async function getAdminContext() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey) return { error: 'Konfigurasi Supabase belum lengkap.' } as const;
  if (!secretKey) return { error: 'Tambahkan SUPABASE_SECRET_KEY di Environment Variables Vercel untuk mengelola akun.' } as const;

  const cookieStore = await cookies();
  const sessionClient = createServerClient(url, publicKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return { error: 'Sesi login tidak valid. Silakan masuk kembali.' } as const;
  const { data: profile, error: profileError } = await sessionClient.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle();
  if (profileError || !profile || profile.role !== 'admin' || !profile.is_active) return { error: 'Aksi ini hanya tersedia untuk admin aktif.' } as const;

  const adminClient = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  return { adminClient, user } as const;
}

export async function listManagedUsers(): Promise<ActionResult> {
  const context = await getAdminContext();
  if ('error' in context) return context;
  const { data: profileRows, error: profileError } = await context.adminClient.from('profiles').select('id,full_name,role,is_active').order('full_name');
  if (profileError) return { error: profileError.message };

  const authUsers: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await context.adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { error: error.message };
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const authById = new Map(authUsers.map(user => [user.id, user]));
  const users = (profileRows ?? []).flatMap(profile => {
    const authUser = authById.get(profile.id);
    if (!authUser) return [];
    return [{ id: profile.id, email: authUser.email || '', full_name: profile.full_name, role: profile.role as ManagedRole, is_active: profile.is_active, invited: !authUser.email_confirmed_at }];
  });
  return { users };
}

export async function inviteManagedUser(emailValue: string, nameValue: string, roleValue: string): Promise<ActionResult> {
  const context = await getAdminContext();
  if ('error' in context) return context;
  const email = emailValue.trim().toLowerCase();
  const fullName = nameValue.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Masukkan alamat email yang valid.' };
  if (fullName.length < 2 || fullName.length > 120) return { error: 'Nama harus terdiri dari 2–120 karakter.' };
  if (!validRoles.includes(roleValue as ManagedRole)) return { error: 'Role yang dipilih tidak valid.' };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!siteUrl) return { error: 'Tambahkan NEXT_PUBLIC_SITE_URL di Vercel dan allow-list URL callback di pengaturan Auth Supabase.' };

  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent('/accept-invite')}`;
  const { data, error } = await context.adminClient.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Supabase tidak mengembalikan akun undangan.' };
  const { error: insertError } = await context.adminClient.from('profiles').upsert({ id: data.user.id, full_name: fullName, role: roleValue, is_active: true }, { onConflict: 'id' });
  if (insertError) return { error: `Undangan terkirim, tetapi profil belum tersimpan: ${insertError.message}` };
  return { message: `Undangan berhasil dikirim ke ${email}.` };
}

export async function createManagedUser(emailValue: string, nameValue: string, password: string, roleValue: string): Promise<ActionResult> {
  const context = await getAdminContext();
  if ('error' in context) return context;
  const email = emailValue.trim().toLowerCase();
  const fullName = nameValue.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Masukkan alamat email yang valid.' };
  if (fullName.length < 2 || fullName.length > 120) return { error: 'Nama harus terdiri dari 2–120 karakter.' };
  if (password.length < 8 || password.length > 72) return { error: 'Kata sandi harus terdiri dari 8–72 karakter.' };
  if (!validRoles.includes(roleValue as ManagedRole)) return { error: 'Role yang dipilih tidak valid.' };

  const { data, error } = await context.adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Supabase tidak mengembalikan akun pengguna.' };

  const { error: profileError } = await context.adminClient.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    role: roleValue,
    is_active: true,
  }, { onConflict: 'id' });
  if (profileError) {
    await context.adminClient.auth.admin.deleteUser(data.user.id);
    return { error: `Profil belum tersimpan dan akun dibatalkan: ${profileError.message}` };
  }
  return { message: `Akun ${email} berhasil dibuat. Sampaikan kata sandi awal kepada pengguna agar bisa login.` };
}

export async function updateManagedUser(id: string, nameValue: string, roleValue: string, active: boolean): Promise<ActionResult> {
  const context = await getAdminContext();
  if ('error' in context) return context;
  const fullName = nameValue.trim();
  if (!id || fullName.length < 2 || fullName.length > 120) return { error: 'ID atau nama pengguna tidak valid.' };
  if (!validRoles.includes(roleValue as ManagedRole)) return { error: 'Role yang dipilih tidak valid.' };
  if (id === context.user.id && !active) return { error: 'Akun admin yang sedang dipakai tidak dapat dinonaktifkan.' };

  const { data: current, error: currentError } = await context.adminClient.from('profiles').select('role,is_active').eq('id', id).maybeSingle();
  if (currentError || !current) return { error: currentError?.message || 'Pengguna tidak ditemukan.' };
  if (current.role === 'admin' && current.is_active && (!active || roleValue !== 'admin')) {
    const { count, error } = await context.adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
    if (error) return { error: error.message };
    if ((count ?? 0) <= 1) return { error: 'Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan rolenya.' };
  }

  const { error: updateError } = await context.adminClient.from('profiles').update({ full_name: fullName, role: roleValue, is_active: active }).eq('id', id);
  if (updateError) return { error: updateError.message };
  const { error: banError } = await context.adminClient.auth.admin.updateUserById(id, { ban_duration: active ? 'none' : '876000h' });
  if (banError) return { error: `Profil tersimpan, tetapi status login belum berhasil diperbarui: ${banError.message}` };
  return { message: active ? 'Pengguna berhasil diperbarui dan diaktifkan.' : 'Pengguna dinonaktifkan. Data dan riwayat dokumennya tetap tersimpan.' };
}
