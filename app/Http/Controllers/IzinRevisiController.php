<?php

namespace App\Http\Controllers;

use App\Models\IzinRevisi;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class IzinRevisiController extends Controller
{
    public function store(Request $request)
    {
        $user = Auth::user();

        // 1️⃣ Cek apakah masih ada izin pending
        $stillPending = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($stillPending) {
            return back()->with('error', 'Izin revisi sudah diajukan dan masih menunggu persetujuan.');
        }

        // 2️⃣ Simpan izin revisi baru
        $izin = IzinRevisi::create([
            'user_id' => $user->id,
            'role'    => $user->role,
            'status'  => 'pending',
        ]);

        // 🔥 Tambahkan Catatan Log Detail
        ActivityLog::create([
            'user_id'     => $user->id,
            'activity'    => 'Ajukan Izin Revisi',
            'description' => 'Mengajukan izin untuk merubah atau menginput data yang sudah terkunci.',
            'details'     => [
                'izin_id' => $izin->id,
                'status'  => 'pending'
            ]
        ]);

        return back()->with('success', 'Permintaan izin revisi berhasil dikirim.');
    }

    public function update(Request $request, IzinRevisi $izinRevisi)
    {
        $action = $request->input('action'); // 'approve' atau 'reject'
        $supervisor = Auth::user();
        
        // Cari nama staff yang meminta izin (agar muncul di log)
        $staff = User::find($izinRevisi->user_id);
        $namaStaff = $staff ? $staff->name : 'Unknown Staff';

        if (!in_array($action, ['approve', 'reject'])) {
            return back()->with('error', 'Aksi tidak valid.');
        }

        if ($action === 'approve') {
            // Ambil data waktu dari request
            $tanggalMulai = $request->input('tanggalMulai');
            $jamMulai = $request->input('jamMulai');
            $tanggalSelesai = $request->input('tanggalSelesai');
            $jamSelesai = $request->input('jamSelesai');

            // Gabungkan tanggal dan jam menjadi datetime
            $startTime = Carbon::createFromFormat('Y-m-d H:i', $tanggalMulai . ' ' . $jamMulai);
            $endTime = Carbon::createFromFormat('Y-m-d H:i', $tanggalSelesai . ' ' . $jamSelesai);

            $izinRevisi->status = 'approved';
            $izinRevisi->start_time = $startTime;
            $izinRevisi->end_time = $endTime;
            $izinRevisi->save();

            // 🔥 Catat di Activity Log (Approve dengan detail waktu buka akses)
            ActivityLog::create([
                'user_id'     => $supervisor->id,
                'activity'    => 'Verifikasi Izin Revisi',
                'description' => "Menyetujui izin revisi untuk {$namaStaff}.",
                'details'     => [
                    'status'         => 'Disetujui',
                    'pemohon'        => $namaStaff,
                    'berlaku_mulai'  => $startTime->format('Y-m-d H:i:s'),
                    'berlaku_sampai' => $endTime->format('Y-m-d H:i:s'),
                ]
            ]);

        } else {
            $izinRevisi->status = 'rejected';
            $izinRevisi->save();

            // 🔥 Catat di Activity Log (Reject)
            ActivityLog::create([
                'user_id'     => $supervisor->id,
                'activity'    => 'Verifikasi Izin Revisi',
                'description' => "Menolak izin revisi untuk {$namaStaff}.",
                'details'     => [
                    'status'  => 'Ditolak',
                    'pemohon' => $namaStaff,
                ]
            ]);
        }

        return back()->with('success', "Izin revisi telah di{$izinRevisi->status}.");
    }
}