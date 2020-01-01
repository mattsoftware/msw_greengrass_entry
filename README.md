# msw_greengrass_entry
Board Support Library for Raspberry Pi Custom Greengrass Entry System

# example usage

```
const entry = require('msw_greengrass_entry')();

entry.scanLoop(v => console.log("...", v, "..."));
```

