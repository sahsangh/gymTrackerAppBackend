require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const exerciseSchema = new mongoose.Schema({
    id: Number,
    name: String,
    muscleGroup: String,
    equipment: String,
});

const workoutSplitSchema = new mongoose.Schema({
    splitId: Number,
    split_name: String,
    exercises: [Number],
});

const Exercise = mongoose.model('Exercise', exerciseSchema, 'exerciseList');
const WorkoutSplit = mongoose.model('WorkoutSplit', workoutSplitSchema, 'workoutSplits');

// Route to get all exercises sorted by id
app.get('/exercises', async (req, res) => {
    try {
        const exercises = await Exercise.find().sort({ id: 1 });
        res.json(exercises);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to create a new workout split with a custom splitId
app.post('/splits', async (req, res) => {
    console.log('Request body:', req.body);
    const { split_name, exercises } = req.body;

    try {
        // Find the highest splitId and increment it for the new split
        const lastSplit = await WorkoutSplit.findOne().sort({ splitId: -1 });
        const newSplitId = lastSplit ? lastSplit.splitId + 1 : 1;  // If no splits exist, start with splitId = 1

        // Create a new split with the generated splitId
        const newSplit = new WorkoutSplit({ splitId: newSplitId, split_name, exercises });
        await newSplit.save();

        res.status(201).json(newSplit);  // Respond with the newly created split
    } catch (err) {
        console.error('Error creating new split:', err);
        res.status(500).json({ error: err.message });
    }
});


app.post('/splits/:splitId/add-exercise', async (req, res) => {
    const { exerciseId } = req.body;
    const { splitId } = req.params;

    console.log('Split ID:', splitId);
    console.log('Exercise ID:', exerciseId);

    try {
        const updatedSplit = await WorkoutSplit.findOneAndUpdate(
            { splitId: splitId },
            { $push: { exercises: exerciseId } },
            { new: true }
        );

        if (!updatedSplit) {
            return res.status(404).json({ error: 'Split not found' });
        }

        res.json(updatedSplit);
    } catch (err) {
        console.error('Error updating split:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// Route to get all workout splits
app.get('/splits', async (req, res) => {
    try {
        const splits = await WorkoutSplit.find();
        res.json(splits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/splits/:splitId', async (req, res) => {
    try {
        const split = await WorkoutSplit.findOne({ splitId: req.params.splitId });
        if (!split) {
            return res.status(404).json({ error: 'Split not found' });
        }
        res.json(split);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/exercises/:id', async (req, res) => {
    try {
        const exerciseId = req.params.id;

        const exercise = await Exercise.findOne({ id: exerciseId });

        if (!exercise) {
            return res.status(404).json({ message: 'Exercise not found' });
        }

        res.json(exercise);
    } catch (error) {
        console.error('Error fetching exercise:', error);
        res.status(500).json({ message: 'Server error' });
    }
});





app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
