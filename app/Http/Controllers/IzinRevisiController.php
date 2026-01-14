<?php

namespace App\Http\Controllers;

use App\Models\IzinRevisi;
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
        IzinRevisi::create([
            'user_id' => $user->id,
            'role'    => $user->role,
            'status'  => 'pending',
        ]);

        return back()->with('success', 'Permintaan izin revisi berhasil dikirim.');
    }

    public function update(Request $request, IzinRevisi $izinRevisi)
    {
        $action = $request->input('action'); // 'approve' atau 'reject'

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
        } else {
            $izinRevisi->status = 'rejected';
        }

        $izinRevisi->save();

        return back()->with('success', "Izin revisi telah di{$izinRevisi->status}.");
    }
}
