>
protected $routeMiddleware = [

    'auth' => \App\Http\Middleware\Authenticate::class,


    'role' => \App\Http\Middleware\CheckRole::class,
];
