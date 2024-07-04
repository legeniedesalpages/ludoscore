<?php

namespace App\Http\Controllers\Api;

use App\Events\UserConnectedEvent;
use App\Models\User;
use Illuminate\Http\Request;
use App\Mail\MyTestEmail;;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    /**
     * Create User
     * @param Request $request
     * @return User 
     */
    public function createUser(Request $request)
    {
        try {
            //Validated
            $validateUser = Validator::make(
                $request->all(),
                [
                    'email' => 'required|email|unique:users,email',
                    'password' => 'required'
                ]
            );

            if ($validateUser->fails()) {
                Log::error($validateUser->errors());
                if ($validateUser->errors() == '{"email":["validation.unique"]}') {
                    return response()->json([
                        'status' => false,
                        'message' => 'Email Déjà Utilisé',
                        'errors' => $validateUser->errors()
                    ], 401);
                }
                return response()->json([
                    'status' => false,
                    'message' => 'validation error',
                    'errors' => $validateUser->errors()
                ], 401);
            }

            try {
                Mail::to("renaud_balu@hotmail.com")->send(new MyTestEmail());
            } catch (\Throwable $th) {
                Log::error("Impossible d'envoyer email: ".$th->getMessage());
                return response()->json([
                    'status' => false,
                        'message' => 'Impossible de créer le compte car on ne peut envoyer le mail de confirmation',
                        'errors' => $th->getMessage()
                ], 500);
            }

            $user = User::create([
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'is_admin' => false
            ]);
            

            return response()->json([
                'status' => true,
                'message' => 'User Created Successfully',
                'token' => $user->createToken("API TOKEN")->plainTextToken
            ], 200);
        } catch (\Throwable $th) {
            Log::error($th->getMessage());
            return response()->json([
                'status' => false,
                'message' => "User Creation Failed"
            ], 500);
        }
    }

    /**
     * Login The User
     * @param Request $request
     * @return User
     */
    public function loginUser(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        try {
            if (Auth::attempt($credentials)) {

                $request->session()->regenerate();

                UserConnectedEvent::dispatch("utilisateur");

                return response()->json(Auth::user()->id);
            } else {

                return response()->json('Invalid credentials', 401);
            }
        } catch (\Throwable $th) {
            return response()->json($th->getMessage(), 500);
        }
    }

    public function logoutUser(Request $request)
    {
        Auth::guard()->logout();
        $request->session()->invalidate();

        return response()->json('User Logged Out Successfully');
    }
}
