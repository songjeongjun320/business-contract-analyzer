import React from "react";
import "./grid.css"; // Ensure that the correct relative path is used

export const GridBox = () => {
  return (
    <div className="grid-container">
      <div className="box">A</div>
      <div className="box">B</div>
      <div className="box">C</div>
      <div className="box">D</div>
    </div>
  );
};
