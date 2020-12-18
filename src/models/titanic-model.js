const mongoose = require('mongoose');

mongoose.pluralize(null);

const titanicSchema = mongoose.Schema({

  survived: {
    type: Boolean,
    required: true
  },
  passengerClass: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  name: {
    type: String,
    required: true
  },

  sex: {
    type: String,
    enum: ["male", "female", "other"],
    required: true
  },
  age: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  siblingsOrSpousesAboard: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },

  parentsOrChildrenAboard: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },

  fare: {
    type: String,
    required: true,
    //validate : {
    //  validator : Number.is,
    //  message   : '{VALUE} is not an integer value'
    // }
  }
});

module.exports = mongoose.model('titanic', titanicSchema);
