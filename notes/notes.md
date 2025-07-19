//notes: 

## CLOSURES: 
    To have multiple users login and have their session run in parallel, you pass a function in login, thus each user has their own instance and own auth token.
    - Structure of closures:
        A function usually returns a function, very similar in structure to SSR in Next
    - Closures allow a function to remember it's scope even when it's parent has stopped/finished executing.
    - Thus you can use this to have sessionToken associated with the user, and multiple users can login and each of them will have their own instances of the function keeping track of their session.

    # Why do these matter?
    - Encapsulation: Each user's session data is encapsulated inside its own closure.
    - Security: Closure provides a form of logical security through scoping

    ```
        function createSecret() {
            const secret = 'hello';
            return function secretToken () {
                return secret
            }
        };

        const getSecret = createSecret();
        console.log(getSecret);
    ```
        In the above fn, as long as the function createSecret is not made available, the 'secret' variable is also not available. It's like a mini "private" variable in an otherwise public environment.
        Thus, when you have variables that shouldn't be modified, you can make functions which do otherwise in these closures, so it's a conditional 'const' variable - you can only modify it though a function in the closure.