<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $date   = $request->query('date');
        $search = $request->query('search');

        $query = ActivityLog::with('user')
            ->when($date, function ($q) use ($date) {
                $q->whereDate('created_at', $date);
            })
            ->when($search, function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('username', 'like', "%{$search}%")
                       ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc');

        $logs = $query->paginate(20)->withQueryString();

        return Inertia::render('LaporanAktivitas', [
            'logs' => [
                'data' => $logs->getCollection()->map(function (ActivityLog $log) {
                    return [
                        'id'          => $log->id,
                        'username'    => $log->user?->username,
                        'name'        => $log->user?->name,
                        'activity'    => $log->activity,
                        'description' => $log->description,
                        'created_at'  => $log->created_at,
                    ];
                }),
                'links' => $logs->links(),
            ],
            'filters' => [
                'date'   => $date,
                'search' => $search,
            ],
        ]);
    }
}
