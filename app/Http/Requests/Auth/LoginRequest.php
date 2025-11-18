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
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // --- KITA UBAH BAGIAN INI ---
        return [
            'username' => ['required', 'string'], // Ganti 'email'
            'password' => ['required', 'string'],
        ];
        // --- BATAS PERUBAHAN ---
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        // --- KITA UBAH BAGIAN INI ---
        if (! Auth::attempt($this->only('username', 'password'), $this->boolean('remember'))) { // Ganti 'email'
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'username' => __('auth.failed'), // Ganti 'email'
            ]);
        }
        // --- BATAS PERUBAHAN ---

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        // --- KITA UBAH BAGIAN INI ---
        throw ValidationException::withMessages([
            'username' => __('auth.throttle', [ // Ganti 'email'
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
        // --- BATAS PERUBAHAN ---
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        // --- KITA UBAH BAGIAN INI ---
        return Str::transliterate(Str::lower($this->string('username')).'|'.$this->ip()); // Ganti 'email'
        // --- BATAS PERUBAHAN ---
    }
}
