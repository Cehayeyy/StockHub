<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

   public function rules(): array
{
    return [
        'name' => ['required', 'string'],
        'password' => ['required', 'string'],
    ];
}

public function authenticate(): void
{
    $this->ensureIsNotRateLimited();

    if (! Auth::attempt(
        ['name' => $this->input('name'), 'password' => $this->input('password')],
        $this->boolean('remember')
    )) {
        RateLimiter::hit($this->throttleKey());

        throw ValidationException::withMessages([
            'name' => __('auth.failed'),
        ]);
    }

    RateLimiter::clear($this->throttleKey());
}


    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'name' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    public function throttleKey(): string
    {
        // key pakai 'name' juga
        return Str::transliterate(Str::lower($this->input('name')).'|'.$this->ip());
    }
}
