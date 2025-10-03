import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Note from "../models/Note.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// @desc      Create a note
// @route     POST /api/v1/notes
// @access    Private
export const createNote = asyncHandler(async (req, res, next) => {
  const { title, isPublic, password, description, project } = req.body;

  // Validate project and createdBy (from auth middleware)
  const proj = await Project.findById(project);
  if (!proj) {
    return next(new ErrorResponse("Project not found.", 404));
  }

  // Ensure password is provided for private notes
  if (isPublic === false && !password) {
    return next(
      new ErrorResponse("Password is required for private notes.", 400)
    );
  }

  const newNote = await Note.create({
    title,
    isPublic,
    password,
    description,
    project,
    // createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: newNote,
  });
});

// @desc      Get all notes
// @route     GET /api/v1/notes
// @route     GET /api/v1/projects/:projectId/notes
// @access    Private
export const getNotes = asyncHandler(async (req, res, next) => {
  let notes;

  if (req.params.projectId) {
    notes = await Note.find({
      project: req.params.projectId,
    }).select("-description -password");
  } else {
    notes = await Note.find()
      .select("-description -password")
      .populate({ path: "project", select: "name" });
    // .populate({ path: "createdBy", select: "email" });
  }

  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes,
  });
});

// @desc      Get a single note
// @route     GET /api/v1/notes/:id
// @access    Private
export const getNote = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.id);
  // .populate({
  //   path: "project",
  //   select: "name",
  // });
  // .populate({ path: "createdBy", select: "email" });

  if (!note) {
    return next(
      new ErrorResponse(`Note not found with id of ${req.params.id}`, 404)
    );
  }

  // Handle access control for private notes
  //   if (!note.isPublic && note.createdBy.toString() !== req.user._id.toString()) {
  if (!note.isPublic && req.user.role !== "Admin") {
    // Note is private and not created by the current user
    if (req.body?.password) {
      const isMatch = await note.matchPassword(password);
      if (!isMatch) {
        return next(new ErrorResponse("Incorrect password.", 401));
      }
    } else {
      return next(
        new ErrorResponse("Access denied. A password is required.", 403)
      );
    }
  }

  res.status(200).json({
    success: true,
    data: note,
  });
});

// @desc      Update a note
// @route     PUT /api/v1/notes/:id
// @access    Private
export const updateNote = asyncHandler(async (req, res, next) => {
  console.log(req.body);
  let note = await Note.findById(req.params.id);

  if (!note) {
    return next(
      new ErrorResponse(`Note not found with id of ${req.params.id}`, 404)
    );
  }

  // Check ownership
  //   if (note.createdBy.toString() !== req.user._id.toString()) {
  //     return next(
  //       new ErrorResponse("You are not authorized to update this note.", 403)
  //     );
  //   }


  note = await Note.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: "query",
  });

  res.status(200).json({
    success: true,
    data: note,
  });
});

// @desc      Delete a note
// @route     DELETE /api/v1/notes/:id
// @access    Private
export const deleteNote = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    return next(
      new ErrorResponse(`Note not found with id of ${req.params.id}`, 404)
    );
  }

  // Check ownership
  //   if (note.createdBy.toString() !== req.user._id.toString()) {
  //     return next(
  //       new ErrorResponse("You are not authorized to delete this note.", 403)
  //     );
  //   }

  await note.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
