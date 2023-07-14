// JavaScript source code
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

const filePath = path.resolve('C:\\Users\\dylan\\OneDrive\\Documents\\GitHub\\Dacqman\\user-data\\capture-options.json');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/save', (req, res) => {
    const inputValues = req.body;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        let options = {};

        try {
            options = JSON.parse(data);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        options.runFileTypeId.value = inputValues.input1;

        fs.writeFile(filePath, JSON.stringify(options, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            return res.status(200).json({ message: 'Data saved successfully' });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
