

![Opeact](https://raw.githubusercontent.com/gabbdev/opeact/main/logoc.png)
Opeact is a simple Node.js library for embedding HTML in JS, eliminating the need for external dependencies.

## Usage
```jsx
const act = require("opeact/opeact");
const server = act.createServer();

// Define routes
act.get("/home", "home.js"); // Reads home.js when accessing /home

act.get("/ping", (req, res) => {
    res.send("pong!");
}); // you can use express function directly.

// Start server
server.listen(80);
```

## Example home.js
```jsx
// home.js
async (req, res) => {
    const document = 
    <html>
        <head>
            <title>Hello World!</title>
        </head>
        <body>
            <img src="/flower.jpg" width="250"/>
            <h1>Welcome to my website!</h1>
        </body>
    </html>;
    
    const text = <a>I love flowers.</a>;
    
    document.body.append(text);
    return document;
}
```


## File Structure

The standard structure for files in Opeact follows this pattern:

```js
() => {
    // Your code here
}
```

```js
// Example with async
async () => {
    // Your asynchronous code here
}
```

When defining routes with external files (e.g., `home.js`), the JavaScript code must be wrapped within either an arrow function without parameters or an asynchronous arrow function. It's important to note that no code should exist outside of this function within the file.


## Sending Responses
To send responses back to the user, you can use the following patterns:

### Sending Strings
```javascript
async () => {
    return "Hello world.";
}
```
### Sending Objects/Arrays (JSON)
```javascript
async () => {
    return {"fruits": ["apple", "banana", "pear"]};
}
```

### And of course, send html elements/pages:
```jsx
async () => {
    return (
        <html>
            <body>
                <h1>Hi there!</h1>
            </body>
        </html>
    );
}
```
When using HTML elements, ensure they are properly formatted within the return statement.

## Manipulating Elements

You can manipulate HTML elements within your JavaScript code. For example:

```jsx
const img = <img id="abc"/>
img.src = "/image.png"
img.style.width = "120px"
img.style.height = "200px"
```

And you can get element properties too.
```jsx
const page = <body> <h1 class="a">Hi there!</h1> </body>
console.log(page.querySelector('.a').textContent) //"Hi there!"
```
