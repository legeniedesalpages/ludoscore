<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ConvertResponseFieldsToCamelCase
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $content = $response->getContent();

        Log::debug("Formatting content from snake_case to camelCase");
        try {
            $json = json_decode($content, true);
            $replaced = [];
            foreach ($json as $key => $value) {
                if (is_array($value)) {

                    $subReplaced = [];
                    foreach ($value as $subkey => $subvalue) {
                        $subReplaced[Str::camel($subkey)] = $subvalue;
                    }

                    $replaced[Str::camel($key)] = $subReplaced;
                } else {                    
                    $replaced[Str::camel($key)] = $value;
                }
            }
            $response->setContent(json_encode($replaced));
        } catch (\Exception $e) {
        }

        return $response;
    }
}
