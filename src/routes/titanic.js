const express = require('express');
const router = express.Router();
const People = require('../models/titanic-model');

// get all passengers
router.get('/', async (req, res) => {
  try {
    const person = await People.find();
    res.status(200).json(person);
  }
  catch (err) {
    res.json({ message: err })
  }
});

// add person
router.post('/', async (req, res) => {
  const person = new People({
    survived: req.body.survived,
    passengerClass: req.body.passengerClass,
    name: req.body.name,
    sex: req.body.sex,
    age: req.body.age,
    siblingsOrSpousesAboard: req.body.siblingsOrSpousesAboard,
    parentsOrChildrenAboard: req.body.parentsOrChildrenAboard,
    fare: req.body.fare
  });

  try {
    const savedPerson = await person.save();
    res.status(200).json(savedPerson);
  } catch (e) {
    res.status(503).json({ message: e });
  }

});

// get specific person
router.get('/:uuid', async (req, res) => {
  try {
    const person = await People.findById({ _id: req.params.uuid });
    res.status(200).json(person);
    console.log(req.params);
  } catch (e) {
    res.status(503).json({ message: e });
  }
});

// delete person
router.delete('/:uuid', async (req, res) => {
  try {
    const removedPost = await People.remove({ _id: req.params.uuid })
    res.status(200).json(removedPost);
  }
  catch (e) {
    res.status(503).json({ message: e });
  }
});

// update person
router.put('/:uuid', async (req, res) => {
  try {
    const updatedPerson = await People.findByIdAndUpdate(req.params.uuid,
      {
        survived: req.body.survived,
        passengerClass: req.body.passengerClass,
        name: req.body.name,
        sex: req.body.sex,
        age: req.body.age,
        siblingsOrSpousesAboard: req.body.siblingsOrSpousesAboard,
        parentsOrChildrenAboard: req.body.parentsOrChildrenAboard,
        fare: req.body.fare
      }
    );
    res.status(201).json(updatedPerson);
    console.log(req.params);
  } catch (e) {
    res.status(503).json({ message: e });
    console.log(req.params);
  }
});

// Partial update, just update name of the person
router.patch('/:uuid', async (req, res) => {
  try {
    const updatedName = await People.updateOne(
      { _id: req.params.uuid },
      { $set: { name: req.body.name } }
    );
    res.status(200).json(updatedName);
  } catch (err) {
    res.status(503).json({ message: err });
  }
});

module.exports = router;