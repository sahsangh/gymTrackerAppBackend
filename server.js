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

const exerciseLogSchema = new mongoose.Schema({
    exerciseId: { type: Number, required: true },
    reps: { type: Number, required: true },
    weight: { type: Number, required: true },
    date: { type: Date, default: Date.now },
});

const Exercise = mongoose.model('Exercise', exerciseSchema, 'exerciseList');
const WorkoutSplit = mongoose.model('WorkoutSplit', workoutSplitSchema, 'workoutSplits');
const ExerciseLog = mongoose.model('ExerciseLog', exerciseLogSchema, 'exerciseLogs');

// Get all exercises sorted by id
app.get('/exercises', async (req, res) => {
    try {
        const exercises = await Exercise.find().sort({ id: 1 });
        res.json(exercises);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new workout split with a custom splitId
app.post('/splits', async (req, res) => {
    console.log('Request body:', req.body);
    const { split_name, exercises } = req.body;

    try {
        const lastSplit = await WorkoutSplit.findOne().sort({ splitId: -1 });
        const newSplitId = lastSplit ? lastSplit.splitId + 1 : 1;

        const newSplit = new WorkoutSplit({ splitId: newSplitId, split_name, exercises });
        await newSplit.save();

        res.status(201).json(newSplit);
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


// Get all workout splits
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

// Update exercises in a split (PATCH endpoint for partial updates)
app.patch('/splits/:splitId/exercises', async (req, res) => {
    const { add, remove } = req.body;
    const { splitId } = req.params;

    console.log('Patching Split ID:', splitId);
    console.log('Adding exercises:', add);
    console.log('Removing exercises:', remove);

    try {
        const split = await WorkoutSplit.findOne({ splitId: splitId });

        if (!split) {
            return res.status(404).json({ error: 'Split not found' });
        }

        let exercises = [...split.exercises];

        // Remove exercises first to avoid duplicates
        if (remove && remove.length > 0) {
            exercises = exercises.filter(id => !remove.includes(id));
        }

        // Add new exercises
        if (add && add.length > 0) {
            // Only add exercises that aren't already in the list
            const newExercises = add.filter(id => !exercises.includes(id));
            exercises = [...exercises, ...newExercises];
        }

        const updatedSplit = await WorkoutSplit.findOneAndUpdate(
            { splitId: splitId },
            { exercises: exercises },
            { new: true }
        );

        res.json({
            split: updatedSplit,
            changes: {
                added: add || [],
                removed: remove || [],
                totalExercises: exercises.length
            }
        });
    } catch (err) {
        console.error('Error patching split:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Keep the PUT endpoint for backward compatibility
app.put('/splits/:splitId', async (req, res) => {
    const { exercises } = req.body;
    const { splitId } = req.params;

    console.log('Updating Split ID:', splitId);
    console.log('New exercises:', exercises);

    try {
        const updatedSplit = await WorkoutSplit.findOneAndUpdate(
            { splitId: splitId },
            { exercises: exercises },
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

// Update split name (PATCH endpoint)
app.patch('/splits/:splitId', async (req, res) => {
    const { split_name } = req.body;
    const { splitId } = req.params;

    console.log('Updating Split Name:', splitId, 'to:', split_name);

    try {
        const updatedSplit = await WorkoutSplit.findOneAndUpdate(
            { splitId: splitId },
            { split_name: split_name },
            { new: true }
        );

        if (!updatedSplit) {
            return res.status(404).json({ error: 'Split not found' });
        }

        res.json(updatedSplit);
    } catch (err) {
        console.error('Error updating split name:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete split (DELETE endpoint)
app.delete('/splits/:splitId', async (req, res) => {
    const { splitId } = req.params;

    console.log('Deleting Split ID:', splitId);

    try {
        const deletedSplit = await WorkoutSplit.findOneAndDelete({ splitId: splitId });

        if (!deletedSplit) {
            return res.status(404).json({ error: 'Split not found' });
        }

        res.json({ message: 'Split deleted successfully', deletedSplit });
    } catch (err) {
        console.error('Error deleting split:', err.message);
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


app.post('/logs', async (req, res) => {
    const { exerciseId, reps, weight, date } = req.body;
    if (!exerciseId || !reps || !weight) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const newLog = new ExerciseLog({
            exerciseId,
            reps,
            weight,
            date: date || Date.now()
        });
        await newLog.save();
        res.status(201).json(newLog);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/logs/:exerciseId', async (req, res) => {
    try {
        const exerciseId = req.params.exerciseId;  // Get exerciseId from the route params
        const logs = await ExerciseLog.find({ exerciseId: exerciseId }).sort({ date: -1 });  // Sort logs by date (newest first)
        res.json(logs);  // Respond with the logs
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
