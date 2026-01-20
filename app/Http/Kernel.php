>
protected $routeMiddleware = [

    'auth' => \App\Http\Middleware\Authenticate::class,

    'division' => \App\Http\Middleware\DivisionMiddleware::class,

    'role' => \App\Http\Middleware\CheckRole::class,

    'checkInputTime' => \App\Http\Middleware\CheckInputTime::class,
];
